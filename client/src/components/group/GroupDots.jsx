export default function GroupDots({ positions }) {
  return positions.map((position, index) => (
    <g key={`${position.userId}-${index}`}>
      <circle cx={position.lat} cy={position.lng} r="5" fill="#2563eb" />
      <text x={position.lat + 8} y={position.lng - 8} fontSize="10" fill="#1e3a8a">
        {position.name}
      </text>
    </g>
  ));
}
