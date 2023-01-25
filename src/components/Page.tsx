export const Page: React.FC<React.PropsWithChildren> = ({ children }) => {
  return (
    <main className="max-w-3xl bg-slate-50 rounded mx-auto p-12 my-16">
      {children}
    </main>
  );
};
