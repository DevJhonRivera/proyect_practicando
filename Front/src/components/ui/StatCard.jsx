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
      p-5"
    >

      <div
        className="
        flex
        justify-between
        items-center"
      >

        <div>

          <p
            className="
            text-gray-500"
          >
            {title}
          </p>

          <h2
            className="
            text-3xl
            font-bold"
          >
            {value}
          </h2>

        </div>

        <Icon
          className="
          text-blue-600"
        />

      </div>

    </div>
  );
}

export default StatCard;