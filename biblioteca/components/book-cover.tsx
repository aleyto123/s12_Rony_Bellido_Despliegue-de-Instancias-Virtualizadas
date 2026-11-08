const colors = ['sage', 'terracotta', 'blue', 'sand', 'plum', 'forest'];
export function BookCover({
  title,
  author = '',
  index = 0,
  small = false,
}: {
  title: string;
  author?: string;
  index?: number;
  small?: boolean;
}) {
  const hash = [...title].reduce((sum, c) => sum + c.charCodeAt(0), index);
  return (
    <div
      className={'book-cover cover-' + colors[hash % colors.length] + (small ? ' cover-small' : '')}
      aria-hidden="true"
    >
      <span className="cover-author">{author}</span>
      <span className="cover-title">{title}</span>
      <div className="cover-motif">
        <i />
        <i />
        <i />
      </div>
      <span className="cover-reference">ÍNDICE · COLECCIÓN</span>
    </div>
  );
}
