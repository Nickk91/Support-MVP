# app/rag/pipeline.py
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import SystemMessage
from langchain_core.runnables import RunnableMap
from langchain_core.output_parsers import StrOutputParser

def build_prompt(system_message: str) -> ChatPromptTemplate:
    return ChatPromptTemplate.from_messages([
        SystemMessage(content=system_message),
        MessagesPlaceholder("context_messages"),
        ("human", "{question}")
    ])

def build_chain(llm, prompt, retriever):
    def join_docs(docs):
        return "\n\n".join(
            f"[{i+1}] {d.page_content}\n(source: {d.metadata.get('source','?')})"
            for i, d in enumerate(docs)
        )

    return (
        RunnableMap({
            "question": lambda x: x["question"],
            "docs":    lambda x: retriever(x["question"]),
        })
        .assign(context=lambda x: join_docs(x["docs"]))
        .assign(context_messages=lambda x: [("system", f"Context:\n{x['context']}")])
        .assign(messages=lambda x: prompt.format_prompt(
            question=x["question"], context_messages=x["context_messages"]
        ).to_messages())
        .pick("messages")          # <-- send ONLY the messages to the chat model
        .pipe(llm)
        .pipe(StrOutputParser())
    )
