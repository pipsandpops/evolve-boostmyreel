interface SpinnerProps {
  size?: number;
}

export function Spinner({ size = 24 }: SpinnerProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className="animate-spin"
    >
      <circle cx="12" cy="12" r="10" stroke="#dbdbdb" strokeWidth="3" />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="url(#spinGrad)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <defs>
        <linearGradient id="spinGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f09433"/>
          <stop offset="100%" stopColor="#bc1888"/>
        </linearGradient>
      </defs>
    </svg>
  );
}
