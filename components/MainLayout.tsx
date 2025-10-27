import React from 'react';

interface MainLayoutProps {
  controlPanel: React.ReactNode;
  documentEditor: React.ReactNode;
  feedbackPanel: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ controlPanel, documentEditor, feedbackPanel }) => {
  return (
    <div className="min-h-screen flex flex-col p-4 sm:p-6 lg:p-8 bg-slate-900">
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-100 tracking-tight">
            Knowledge Weaver
          </h1>
        </div>
      </header>
      <main className="flex-grow grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8">
        <div className="md:col-span-3 lg:col-span-3 flex flex-col">
          {controlPanel}
        </div>
        <div className="md:col-span-9 lg:col-span-9 flex flex-col">
          {documentEditor}
        </div>
        <div className="md:col-span-12 lg:col-span-12 flex flex-col">
          {feedbackPanel}
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
