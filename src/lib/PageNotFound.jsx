import { useLocation, Link } from 'react-router-dom';

export default function PageNotFound() {
  const location = useLocation();
  const pageName = location.pathname.substring(1);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-7xl font-light text-slate-300">404</h1>
          <div className="h-0.5 w-16 bg-slate-200 mx-auto"></div>
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-medium text-slate-700">Page not found</h2>
          {pageName && <p className="text-slate-500 text-sm">The page <code className="bg-slate-100 px-1 rounded">/{pageName}</code> doesn't exist.</p>}
        </div>
        <Link to="/" className="inline-block px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm">
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
