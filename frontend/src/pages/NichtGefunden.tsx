import { Link } from "react-router-dom";
import { BearSays } from "../components/SpeechBubble";

/** Platzhalter für Seiten, die in Meilenstein 4 folgen. */
export function Bald() {
  return (
    <div className="page-pad">
      <BearSays role="status" actions={<Link to="/" className="btn btn-primary">Zur Sammlung</Link>}>
        Daran koche ich noch! Das kommt bald.
      </BearSays>
    </div>
  );
}
