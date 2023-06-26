export const Page: React.FC<React.PropsWithChildren> = ({ children }) => {
  return (
    <main className="max-w-3xl bg-slate-100 border rounded mx-auto p-12 my-16">
      {children}
    </main>
  );
};
