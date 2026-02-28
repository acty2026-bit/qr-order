export default function HomePage() {
  return (
    <main>
      <h1>QR Order MVP</h1>
      <p>URLに store/table クエリを付与して利用してください。</p>
      <ul>
        <li>/order?store=demo-store&table=3</li>
        <li>/kitchen?store=demo-store</li>
        <li>/admin?store=demo-store</li>
        <li>/admin/menu?store=demo-store</li>
        <li>/admin/reports?store=demo-store</li>
      </ul>
    </main>
  );
}
