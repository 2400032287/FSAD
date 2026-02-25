export default function RoleCard({ title, description, onClick }) {
  return (
    <button className="card" onClick={onClick} type="button">
      <h2>{title}</h2>
      <p>{description}</p>
    </button>
  );
}
