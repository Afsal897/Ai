// Props type for CircleProgress component
type CircleProgressProps = {
  percentage: number;  // Progress value in percentage (0 to 100)
  strokeColor: string; // Color of the progress stroke
};

// CircleProgress component - Renders a circular progress indicator using SVG
const CircleProgress = ({ percentage, strokeColor }: CircleProgressProps) => {
  const radius = 45;           // Radius of the circle
  const stroke = 8;            // Stroke width of the circle
  const normalizedRadius = radius - stroke * 0.5;  // Adjust radius for stroke width
  const circumference = normalizedRadius * 2 * Math.PI;  // Circle circumference
  const strokeDashoffset =
    circumference - (percentage / 100) * circumference; // Offset based on percentage

  return (
    <svg height={radius * 2} width={radius * 2}>
      {/* Background circle (gray) */}
      <circle
        stroke="#e6e6e6"
        fill="transparent"
        strokeWidth={stroke}
        r={normalizedRadius}
        cx={radius}
        cy={radius}
      />
      
      {/* Foreground progress circle */}
      <circle
        stroke={strokeColor}
        fill="transparent"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference + " " + circumference}
        style={{ strokeDashoffset, transition: "stroke-dashoffset 0.5s" }} // Smooth animation
        r={normalizedRadius}
        cx={radius}
        cy={radius}
      />
      
      {/* Percentage text in center */}
      <text
        x="50%"
        y="50%"
        dominantBaseline="middle"
        textAnchor="middle"
        fontSize="18"
        fill="#333"
        fontWeight="bold"
      >
        {percentage}%
      </text>
    </svg>
  );
};

export default CircleProgress;
