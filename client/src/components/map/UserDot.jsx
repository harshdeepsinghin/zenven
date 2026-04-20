export default function UserDot({ position }) {
  if (!position) {
    return null;
  }

  return (
    <>
      <circle cx={position.lat} cy={position.lng} r="12" fill="rgba(17,75,54,0.2)" className="fan-dot" />
      <circle cx={position.lat} cy={position.lng} r="6" fill="#114b36" />
    </>
  );
}
