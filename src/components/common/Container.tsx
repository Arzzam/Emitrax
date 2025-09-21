const MainContainer = ({ children }: { children: React.ReactNode }) => {
    return <div className="container mx-auto p-4 h-[calc(100vh-60px)] overflow-y-auto">{children}</div>;
};

export default MainContainer;
