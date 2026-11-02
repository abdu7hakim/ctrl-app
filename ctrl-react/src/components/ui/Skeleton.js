function Skeleton({ className = '' }) {
  return <div className={`skeleton animate-pulse bg-gray-200 rounded-md ${className}`.trim()} aria-hidden="true" />;
}

export default Skeleton;
