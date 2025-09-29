const TestPage = () => {
  return (
    <div className="grid gap-3 p-6">
      <div className="p-4 rounded-lg border bg-background text-foreground">
        Background / Foreground
      </div>
      <div className="p-4 rounded-lg border bg-card text-card-foreground">
        Card
      </div>
      <button className="px-4 py-2 rounded-md bg-primary text-primary-foreground">
        Primary
      </button>
      <button className="px-4 py-2 rounded-md bg-secondary text-secondary-foreground">
        Secondary
      </button>
      <button className="px-4 py-2 rounded-md bg-accent text-accent-foreground">
        Accent
      </button>

      <button class="bg-burple-900 hover:bg-burple-700 text-white">
        Primary
      </button>
      <div class="bg-burple-100 text-burple-900">Card</div>
    </div>
  );
};

export default TestPage;
