export default function WorkspaceLoading() {
  return <main className="app-content" aria-busy="true" aria-label="Loading workspace">
    <div className="skeleton skeleton-title"/><div className="skeleton-grid">{[1,2,3,4].map((item) => <div className="skeleton skeleton-stat" key={item}/>)}</div>
    <div className="skeleton-grid skeleton-grid-bottom"><div className="skeleton skeleton-panel"/><div className="skeleton skeleton-panel"/></div>
  </main>;
}
