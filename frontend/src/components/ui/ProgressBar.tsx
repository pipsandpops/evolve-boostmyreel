interface ProgressBarProps {
  percent: number;
  label?: string;
}

export function ProgressBar({ percent, label }: ProgressBarProps) {
  return (
    <div style={{ width: '100%' }}>
      {label && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#8e8e8e', marginBottom: 6 }}>
          <span>{label}</span>
          <span>{percent}%</span>
        </div>
      )}
      <div style={{ width: '100%', background: '#efefef', borderRadius: 99, height: 4, overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${percent}%`,
            borderRadius: 99,
            background: 'linear-gradient(90deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)',
            transition: 'width 0.5s ease-out',
          }}
        />
      </div>
    </div>
  );
}
