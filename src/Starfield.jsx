const stars = Array.from({ length: 64 }, (_, index) => {
  const fraction = (value) => value - Math.floor(value);
  return {
    x: 2 + fraction(index * 0.61803398875 + 0.17) * 96,
    y: 2 + fraction(index * 0.75487766625 + 0.41) * 96,
    size: index % 9 === 0 ? 2.2 : 1 + (index % 3) * 0.35,
    duration: 4.5 + (index % 8) * 0.45,
    delay: -(index * 0.73),
    glint: index % 16 === 0,
  };
});

export default function Starfield() {
  return (
    <div className="starfield" aria-hidden="true">
      {stars.map((star, index) => (
        <span
          key={index}
          className={`background-star${star.glint ? ' background-star--glint' : ''}`}
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            animationDuration: `${star.duration}s`,
            animationDelay: `${star.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
