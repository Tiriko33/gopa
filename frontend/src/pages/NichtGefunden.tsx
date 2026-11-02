import { Link } from "react-router-dom";
import { BearSays } from "../components/SpeechBubble";

/** Unbekannte Adresse. */
export function NichtGefunden() {
  return (
    <div className="page-pad">
      <BearSays role="status" actions={<Link to="/" className="btn btn-primary">Zur Sammlung</Link>}>
        Hier ist nichts im Topf. Diese Seite gibt es nicht.
      </BearSays>
    </div>
  );
}
