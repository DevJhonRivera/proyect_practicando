function Card({
  title,
  value,
}) {
  return (
    <div
      className="
      bg-white
      rounded-xl
      shadow
      p-6
      metric-card"
    >

      <p
        className="
        text-gray-500"
      >
        {title}
      </p>

      <h2
        className="
        metric-value
        font-bold"
      >
        {value}
      </h2>

    </div>
  );
}

export default Card;
