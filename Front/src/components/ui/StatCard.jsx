function StatCard({
  title,
  value,
  icon: Icon,
}) {

  return (
    <div
      className="
      bg-white
      rounded-xl
      shadow-md
      p-5
      metric-card"
    >

      <div
        className="
        flex
        justify-between
        items-center
        gap-3"
      >

        <div className="min-w-0 flex-1">

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

        <Icon
          className="
          shrink-0
          text-blue-600"
        />

      </div>

    </div>
  );
}

export default StatCard;
