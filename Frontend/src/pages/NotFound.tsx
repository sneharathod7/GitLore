import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-[calc(100vh-56px)] items-center justify-center bg-gitlore-bg px-4">
      <div className="text-center">
        <h1 className="mb-4 font-heading text-4xl font-bold text-gitlore-text">404</h1>
        <p className="mb-4 text-lg text-gitlore-text-secondary sm:text-xl">Oops! Page not found</p>
        <a href="/" className="text-sm text-gitlore-accent underline hover:text-gitlore-accent-hover">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
