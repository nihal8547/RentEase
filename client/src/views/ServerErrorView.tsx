import React from 'react';
import { Link } from 'react-router-dom';
import { ServerCrash, ArrowLeft, RotateCcw } from 'lucide-react';
import { Button } from '../components/ui/button';

const ServerErrorView: React.FC = () => {
  return (
    <div className="min-h-screen bg-sand-050 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-line p-8 text-center animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-ruby-100 flex items-center justify-center mx-auto mb-6 text-ruby-600">
          <ServerCrash size={32} />
        </div>
        
        <h1 className="font-serif text-3xl font-bold text-ink-900 mb-2">500</h1>
        <h2 className="text-xl font-semibold text-ink-900 mb-4">Internal Server Error</h2>
        
        <p className="text-ink-600 text-sm mb-8 leading-relaxed">
          The server encountered an unexpected condition that prevented it from fulfilling your request. We've been notified and are looking into it.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            variant="secondary"  
            className="flex-1 flex items-center justify-center gap-2"
            onClick={() => window.location.reload()}
          >
            <RotateCcw size={16} />
            <span>Try Again</span>
          </Button>
          <Link to="/" className="flex-1">
            <Button variant="primary" className="w-full flex items-center justify-center gap-2">
              <ArrowLeft size={16} />
              <span>Back to Dashboard</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ServerErrorView;
