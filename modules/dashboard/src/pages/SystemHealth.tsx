import React, { useEffect } from 'react';
import { useSystemStore } from '../stores';

// Simple Icon Components to avoid external dependencies
const CheckCircleIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ExclamationCircleIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
  </svg>
);

const XCircleIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ServerIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 17.25v-.228a4.5 4.5 0 00-.12-1.03l-2.268-9.64a3.375 3.375 0 00-3.285-2.602H7.923a3.375 3.375 0 00-3.285 2.602l-2.268 9.64a4.5 4.5 0 00-.12 1.03v.228m19.5 0a3 3 0 01-3 3H5.25a3 3 0 01-3-3m19.5 0a3 3 0 00-3-3H5.25a3 3 0 00-3 3m16.5 0h.008v.008h-.008v-.008zm-3 0h.008v.008h-.008v-.008z" />
  </svg>
);

const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    healthy: 'bg-green-100 text-green-800',
    degraded: 'bg-yellow-100 text-yellow-800',
    critical: 'bg-red-100 text-red-800',
    down: 'bg-red-100 text-red-800',
  };

  const icons: Record<string, React.ReactNode> = {
    healthy: <CheckCircleIcon className="w-4 h-4 mr-1" />,
    degraded: <ExclamationCircleIcon className="w-4 h-4 mr-1" />,
    critical: <XCircleIcon className="w-4 h-4 mr-1" />,
    down: <XCircleIcon className="w-4 h-4 mr-1" />,
  };

  const key = status.toLowerCase();
  const style = styles[key] || 'bg-gray-100 text-gray-800';
  const icon = icons[key] || <ExclamationCircleIcon className="w-4 h-4 mr-1" />;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style}`}>
      {icon}
      {status.toUpperCase()}
    </span>
  );
};

export default function SystemHealthPage() {
  const { systemHealth, connectionStatus, connect } = useSystemStore();

  useEffect(() => {
    // Ensure connection is active when visiting this page
    if (connectionStatus === 'disconnected') {
      connect();
    }
  }, [connectionStatus, connect]);

  if (!systemHealth && connectionStatus === 'connecting') {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
        <p className="text-gray-500">Connecting to system telemetry...</p>
      </div>
    );
  }

  if (!systemHealth) {
    return (
      <div className="p-6 text-center bg-white rounded-lg shadow">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
          <XCircleIcon className="h-6 w-6 text-red-600" />
        </div>
        <h3 className="text-lg font-medium text-gray-900">System Telemetry Unavailable</h3>
        <p className="mt-2 text-sm text-gray-500">
          Could not retrieve health metrics. The system might be offline or the WebSocket connection failed.
        </p>
        <div className="mt-6">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            connectionStatus === 'connected' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            Connection Status: {connectionStatus.toUpperCase()}
          </span>
        </div>
        <div className="mt-6">
            <button 
                onClick={() => connect()}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
                Retry Connection
            </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <div className="md:flex md:items-center md:justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
              System Health Monitor
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Real-time operational status of all AlphaPro components.
            </p>
          </div>
          <div className="mt-4 flex flex-col items-end md:ml-4 md:mt-0">
            <div className="flex items-center">
                <span className="mr-2 text-sm text-gray-500">Overall Status:</span>
                <StatusBadge status={systemHealth.overall} />
            </div>
            <span className="mt-1 text-xs text-gray-400">
              Last updated: {new Date(systemHealth.lastUpdate).toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>

      {/* Components Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {systemHealth.components.map((component) => (
          <div key={component.name} className="bg-white overflow-hidden shadow rounded-lg border border-gray-200 hover:shadow-md transition-shadow duration-200">
            <div className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                    <div className="flex-shrink-0 bg-indigo-50 rounded-md p-3">
                    <ServerIcon className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">{component.name}</h3>
                    <p className="text-sm text-gray-500">Component</p>
                    </div>
                </div>
                <StatusBadge status={component.status} />
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3 border-t border-gray-100">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wide font-semibold">Latency</p>
                  <p className="font-medium text-gray-900 mt-1">
                    {component.latency !== undefined ? `${component.latency}ms` : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wide font-semibold">Error Rate</p>
                  <p className={`font-medium mt-1 ${
                    (component.errorRate || 0) > 0 ? 'text-red-600' : 'text-gray-900'
                  }`}>
                    {component.errorRate !== undefined ? `${component.errorRate}%` : '0%'}
                  </p>
                </div>
              </div>
              
              {component.details && Object.keys(component.details).length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                   <p className="text-gray-500 text-xs uppercase tracking-wide font-semibold mb-1">Details</p>
                   <div className="bg-gray-100 rounded p-2 text-xs font-mono text-gray-600 overflow-x-auto">
                     <pre>{JSON.stringify(component.details, null, 2)}</pre>
                   </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}