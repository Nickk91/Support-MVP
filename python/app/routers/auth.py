# python\app\routers\auth.py

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from datetime import timedelta
import uuid

# Fix the imports - remove duplicates and fix the typo
from app.models.models import User, Tenant, Base
from app.auth.auth import (
    get_password_hash, verify_password, create_access_token, 
    verify_token, UserCreate, UserLogin, Token, ACCESS_TOKEN_EXPIRE_MINUTES,
    TokenData
)
from app.config import get_db, engine

router = APIRouter()
security = HTTPBearer()

# Create tables (run once)
Base.metadata.create_all(bind=engine)

# Dependency to get current user from JWT
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    token_data = verify_token(credentials.credentials)
    if token_data is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return token_data

# Only allow client admins
def require_client_admin(current_user: TokenData = Depends(get_current_user)):
    if current_user.role != "client_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )
    return current_user

@router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create tenant
    tenant = Tenant(
        company_name=user_data.company_name,
        subdomain=user_data.company_name.lower().replace(" ", "-")[:50]
    )
    db.add(tenant)
    db.flush()  # Get the tenant ID
    
    # Create user (client admin)
    user = User(
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        role="client_admin",
        tenant_id=tenant.id
    )
    db.add(user)
    db.commit()
    
    # Create access token
    access_token = create_access_token(
        data={
            "sub": user.id,
            "tenant_id": tenant.id,
            "role": user.role
        },
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user_id=user.id,
        tenant_id=tenant.id,
        role=user.role
    )

@router.post("/auth/login", response_model=Token)
async def login(login_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,  # Fixed typo: BADDENIED -> BAD_REQUEST
            detail="Inactive user"
        )
    
    access_token = create_access_token(
        data={
            "sub": user.id,
            "tenant_id": user.tenant_id,
            "role": user.role
        },
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user_id=user.id,
        tenant_id=user.tenant_id,
        role=user.role
    )

@router.get("/auth/me")
async def get_current_user_info(current_user: TokenData = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == current_user.user_id).first()
    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    
    return {
        "user_id": user.id,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "role": user.role,
        "tenant": {
            "id": tenant.id,
            "company_name": tenant.company_name,
            "plan": tenant.plan
        }
    }