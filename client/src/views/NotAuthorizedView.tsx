import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';

export const NotAuthorizedView: React.FC = () => {
  return (
    <div className="min-h-screen bg-sand-050 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-line p-8 text-center animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-ruby-100 flex items-center justify-center mx-auto mb-6 text-ruby-600">
          <ShieldAlert size={32} />
        </div>
        
        <h1 className="font-serif text-3xl font-bold text-ink-900 mb-2">Not Authorized</h1>
        <h2 className="text-xl font-semibold text-ink-900 mb-4">Access Restricted</h2>
        
        <p className="text-ink-600 text-sm mb-8">
          You do not have the required permissions to access this page. Please contact your agency administrator if you believe this is an error.
        </p>
        
        <Link to="/" className="inline-block w-full">
          <Button variant="primary" className="w-full flex items-center justify-center gap-2 py-3">
            <ArrowLeft size={16} />
            <span>Return to Dashboard</span>
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default NotAuthorizedView;
