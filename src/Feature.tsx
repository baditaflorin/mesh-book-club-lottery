import { useMemo, useState } from "react";
import {
  MeshNameInput,
  useNamedPeer,
  usePerPeerValue,
  type MeshConfig,
  type YRoom,
} from "@baditaflorin/mesh-common";

type Props = { room: YRoom | null; config: MeshConfig };

export type Nomination = { title: string; author: string; submittedAt: number };
const EMPTY: Nomination | null = null;
export function isValidNomination(value: unknown): value is Nomination {
  if (!value || typeof value !== "object") return false;
  const n = value as Record<string, unknown>;
  return (
    typeof n.title === "string" &&
    n.title.trim().length > 0 &&
    n.title.length <= 90 &&
    typeof n.author === "string" &&
    n.author.trim().length > 0 &&
    n.author.length <= 70 &&
    typeof n.submittedAt === "number" &&
    Number.isFinite(n.submittedAt) &&
    n.submittedAt > 0
  );
}
export function drawIndex(nominations: Array<[string, Nomination]>): number {
  const source = nominations
    .slice()
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, n]) => `${id}:${n.title.trim().toLowerCase()}:${n.author.trim().toLowerCase()}`)
    .join("|");
  let hash = 2166136261;
  for (const char of source) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return nominations.length ? (hash >>> 0) % nominations.length : -1;
}
function nameFor(id: string, nameOf: (peerId: string) => string | undefined) {
  return nameOf(id) || `Reader ${id.slice(0, 5)}`;
}

export function Feature({ room, config }: Props) {
  const named = useNamedPeer(config, room);
  const nominations = usePerPeerValue<Nomination | null>(
    room,
    "mesh-book-club-lottery:nominations",
    EMPTY,
  );
  const reveals = usePerPeerValue<boolean>(room, "mesh-book-club-lottery:reveal", false);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const mine = isValidNomination(nominations.my) ? nominations.my : null;
  const entries = useMemo(
    () =>
      nominations.entries
        .filter((entry): entry is [string, Nomination] => isValidNomination(entry[1]))
        .sort((a, b) => a[1].submittedAt - b[1].submittedAt),
    [nominations.entries],
  );
  const winner = entries[drawIndex(entries)];
  const revealed = reveals.entries.some(([, value]) => value === true);
  const canNominate = Boolean(room) && !mine && title.trim().length > 0 && author.trim().length > 0;
  return (
    <main className="lottery-page">
      <header>
        <p className="eyebrow">Mesh book club</p>
        <h1>Let the next read choose itself.</h1>
        <p className="intro">
          Each reader gets one lasting nomination. The result is a room-wide, reproducible draw from
          the exact shared list.
        </p>
        <p role="status" className="connection">
          {room
            ? `Connected with ${room.peerCount} peer${room.peerCount === 1 ? "" : "s"}`
            : "Connecting to your reading room…"}
        </p>
      </header>
      <section className="lottery-grid">
        <section className="card composer" aria-labelledby="nominate-heading">
          <p className="eyebrow">Your nomination</p>
          <h2 id="nominate-heading">
            {mine ? "Your book is in the draw" : "One reader, one book"}
          </h2>
          {mine ? (
            <>
              <blockquote>
                <strong>{mine.title}</strong>
                <br />
                by {mine.author}
              </blockquote>
              <p role="status">
                Saved once for this device. Nominations stay fixed so the draw cannot be inflated.
              </p>
            </>
          ) : (
            <>
              <MeshNameInput
                label="Your name"
                value={named.name}
                onChange={named.setName}
                placeholder="Reader name"
                maxLength={32}
              />
              <label htmlFor="title">Book title</label>
              <input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, 90))}
                maxLength={90}
                placeholder="The book you want to read"
              />
              <label htmlFor="author">Author</label>
              <input
                id="author"
                value={author}
                onChange={(e) => setAuthor(e.target.value.slice(0, 70))}
                maxLength={70}
                placeholder="Who wrote it?"
              />
              <button
                type="button"
                className="primary"
                onClick={() =>
                  canNominate &&
                  nominations.setMy({
                    title: title.trim(),
                    author: author.trim(),
                    submittedAt: Date.now(),
                  })
                }
                disabled={!canNominate}
              >
                Add my one nomination
              </button>
              <p role="status">
                The title and author are validated before they enter the shared room.
              </p>
            </>
          )}
        </section>
        <section className="card draw" aria-labelledby="draw-heading">
          <p className="eyebrow">The transparent draw</p>
          <h2 id="draw-heading">
            {entries.length} book{entries.length === 1 ? "" : "s"} in the hat
          </h2>
          <p className="explain">
            Everyone derives the same winner from the sorted shared nominations. Any peer can reveal
            it; no hidden host or server decides.
          </p>
          {!revealed ? (
            <button
              className="primary"
              type="button"
              onClick={() => reveals.setMy(true)}
              disabled={!room || !entries.length}
            >
              Reveal the room’s pick
            </button>
          ) : winner ? (
            <div className="winner" role="status">
              <span>Tonight’s pick</span>
              <strong>{winner[1].title}</strong>
              <em>by {winner[1].author}</em>
              <small>Nominated by {nameFor(winner[0], named.nameOf)}</small>
            </div>
          ) : (
            <p className="empty">Add a nomination before revealing.</p>
          )}
        </section>
      </section>
      <section className="card shelf" aria-labelledby="shelf-heading">
        <p className="eyebrow">Shared shelf</p>
        <h2 id="shelf-heading">Everyone’s one book</h2>
        {entries.length ? (
          <ol>
            {entries.map(([id, n]) => (
              <li key={id}>
                <span>{nameFor(id, named.nameOf)}</span>
                <strong>{n.title}</strong>
                <small>{n.author}</small>
              </li>
            ))}
          </ol>
        ) : (
          <p className="empty">The shelf fills as readers arrive.</p>
        )}
      </section>
    </main>
  );
}
