export function LibraryArt({ small = false }: { small?: boolean }) {
  return (
    <div className={'library-art ' + (small ? 'art-small' : '')} aria-hidden="true">
      <div className="art-orbit orbit-one" />
      <div className="art-orbit orbit-two" />
      <div className="art-glow" />
      <div className="display-book display-book-back">
        <span className="display-book-label">COLECCIÓN ÍNDICE</span>
        <strong>
          VOCES
          <br />
          DEL
          <br />
          MUNDO
        </strong>
        <span className="book-star">✳</span>
      </div>
      <div className="display-book display-book-front">
        <span className="display-book-label">UN NUEVO CAPÍTULO</span>
        <strong>
          El arte
          <br />
          de perderse
          <br />
          leyendo.
        </strong>
        <div className="book-line-art">
          <i />
          <i />
          <i />
        </div>
        <span className="display-book-edition">ÍNDICE · BIBLIOTECA PERSONAL</span>
      </div>
      <span className="art-spark spark-one">+</span>
      <span className="art-spark spark-two">+</span>
      <span className="art-dot" />
    </div>
  );
}
