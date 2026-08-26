import { useMemo, useState } from "react";
import {
  MeshButton,
  MeshNameInput,
  MeshPresence,
  MeshStatusPill,
  MeshSurface,
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
  const peerCount = room?.peerCount ?? 0;
  const roomReady = Boolean(room);
  const entryLabel = entries.length === 1 ? "title" : "titles";
  return (
    <main className="book-club-page">
      <section className="book-club-frame" aria-labelledby="book-club-heading">
        <header className="book-club-hero">
          <div className="book-club-hero-copy">
            <p className="book-club-kicker">Reading room / shared selection</p>
            <h1 id="book-club-heading">Choose the next book together.</h1>
            <p className="book-club-intro">
              One considered nomination from every reader. One transparent draw the whole room can
              verify.
            </p>
          </div>
          <div className="book-club-room-state" aria-label="Reading room status">
            <MeshPresence
              count={peerCount}
              label={peerCount === 1 ? "reader present" : "readers present"}
              state={roomReady ? "connected" : "connecting"}
              size="md"
            />
            <MeshStatusPill
              tone={roomReady ? "success" : "warning"}
              dot
              announce="polite"
              className="book-club-status"
            >
              {roomReady ? "Shared list live" : "Joining room"}
            </MeshStatusPill>
          </div>
        </header>

        <section className="book-club-workspace" aria-label="Book club draw workspace">
          <MeshSurface
            as="section"
            tone="raised"
            padding="lg"
            className="book-club-nomination"
            aria-labelledby="nominate-heading"
          >
            <div className="book-club-panel-heading">
              <p className="book-club-step">01 / Your entry</p>
              <h2 id="nominate-heading">
                {mine ? "Your title is on the list." : "Bring one title to the table."}
              </h2>
            </div>
            {mine ? (
              <div className="book-club-saved-entry" role="status">
                <span className="book-club-saved-label">Locked nomination</span>
                <strong>{mine.title}</strong>
                <span>by {mine.author}</span>
                <p>
                  Your entry is fixed for this draw, keeping every reader’s chance equally weighted.
                </p>
              </div>
            ) : (
              <form
                className="book-club-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!canNominate) return;
                  nominations.setMy({
                    title: title.trim(),
                    author: author.trim(),
                    submittedAt: Date.now(),
                  });
                }}
              >
                <MeshNameInput
                  label="Your name"
                  value={named.name}
                  onChange={named.setName}
                  placeholder="Reader name"
                  maxLength={32}
                  className="book-club-name"
                />
                <label className="book-club-field" htmlFor="title">
                  <span>Book title</span>
                  <input
                    id="title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value.slice(0, 90))}
                    maxLength={90}
                    placeholder="The book you want to read"
                  />
                </label>
                <label className="book-club-field" htmlFor="author">
                  <span>Author</span>
                  <input
                    id="author"
                    value={author}
                    onChange={(event) => setAuthor(event.target.value.slice(0, 70))}
                    maxLength={70}
                    placeholder="Who wrote it?"
                  />
                </label>
                <MeshButton
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  disabled={!canNominate}
                >
                  Add my nomination
                </MeshButton>
                <p className="book-club-form-note">
                  Your entry is published to this room once, then held for the common draw.
                </p>
              </form>
            )}
          </MeshSurface>

          <MeshSurface
            as="section"
            tone="accent"
            padding="lg"
            className="book-club-draw"
            aria-labelledby="draw-heading"
          >
            <div className="book-club-panel-heading">
              <p className="book-club-step">02 / Room draw</p>
              <h2 id="draw-heading">The table is waiting.</h2>
            </div>
            <div
              className="book-club-count"
              aria-label={`${entries.length} ${entryLabel} in the draw`}
            >
              <span>{String(entries.length).padStart(2, "0")}</span>
              <p>
                {entryLabel} ready for
                <br />
                the shared pick
              </p>
            </div>
            {!revealed ? (
              <div className="book-club-draw-action">
                <p>
                  The result is derived from the exact same list on every connected device. No host
                  gets to choose it.
                </p>
                <MeshButton
                  variant="secondary"
                  size="lg"
                  fullWidth
                  onClick={() => reveals.setMy(true)}
                  disabled={!roomReady || !entries.length}
                >
                  Reveal the room’s pick
                </MeshButton>
              </div>
            ) : winner ? (
              <div className="book-club-winner" role="status" aria-live="polite">
                <span className="book-club-winner-label">Tonight’s pick</span>
                <strong>{winner[1].title}</strong>
                <em>by {winner[1].author}</em>
                <small>Nominated by {nameFor(winner[0], named.nameOf)}</small>
              </div>
            ) : (
              <p className="book-club-empty">Add a title before the room can draw.</p>
            )}
          </MeshSurface>
        </section>

        <MeshSurface
          as="section"
          tone="quiet"
          padding="lg"
          className="book-club-shelf"
          aria-labelledby="shelf-heading"
        >
          <div className="book-club-shelf-heading">
            <div>
              <p className="book-club-step">Shared reading list</p>
              <h2 id="shelf-heading">The books on the table</h2>
            </div>
            <MeshStatusPill tone={entries.length ? "info" : "neutral"} dot>
              {entries.length ? `${entries.length} ${entryLabel} queued` : "Open for nominations"}
            </MeshStatusPill>
          </div>
          {entries.length ? (
            <ol className="book-club-list">
              {entries.map(([id, nomination], index) => (
                <li key={id}>
                  <span className="book-club-list-order">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <strong>{nomination.title}</strong>
                    <span>by {nomination.author}</span>
                  </div>
                  <small>{nameFor(id, named.nameOf)}</small>
                </li>
              ))}
            </ol>
          ) : (
            <p className="book-club-shelf-empty">
              The shared list will appear here as readers add their chosen book.
            </p>
          )}
        </MeshSurface>
      </section>
    </main>
  );
}
