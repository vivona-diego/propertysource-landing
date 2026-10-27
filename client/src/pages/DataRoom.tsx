import DataRoomShell, { DataRoomBrand } from "@/components/DataRoomShell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { DataRoomDocument, documentKind, formatDataRoomDate, formatDocumentSize } from "@/lib/dataRoom";
import { startLogin } from "@/const";
import {
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  Download,
  FileSearch,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  KeyRound,
  LibraryBig,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Search,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { useLocation } from "wouter";

function readableError() {
  return "We couldn’t complete that request. Please check your details and try again.";
}

function PasswordField({ id = "password", value, onChange, autoComplete = "current-password" }: { id?: string; value: string; onChange: (value: string) => void; autoComplete?: string }) {
  return <Input id={id} type="password" minLength={12} maxLength={128} required value={value} onChange={event => onChange(event.target.value)} autoComplete={autoComplete} className="data-room-input" />;
}

function PasswordLogin({ checkingAccess = false }: { checkingAccess?: boolean }) {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sessionBlocked, setSessionBlocked] = useState(false);
  const isEmbedded = window.self !== window.top;
  const standaloneSignInUrl = `${window.location.origin}/data-room`;
  const login = trpc.dataRoom.login.useMutation({
    onSuccess: async () => {
      try {
        // Confirm the browser retained the HttpOnly session before treating login as complete.
        const actor = await utils.dataRoom.me.fetch(undefined, { staleTime: 0 });
        if (!actor) {
          setSessionBlocked(true);
          setError("Your password was accepted, but this browser did not keep your sign-in session. Open sign-in in a new tab and allow cookies for this website.");
          return;
        }
        setLocation("/data-room");
      } catch {
        setError("Your password was accepted, but we could not verify your session. Please try again shortly.");
      }
    },
    onError: error => setError(error.data?.code === "TOO_MANY_REQUESTS" ? "Too many sign-in attempts. Please try again in 15 minutes." : error.data?.code === "SERVICE_UNAVAILABLE" ? "The secure data room is temporarily unavailable. Please try again shortly." : "Unable to sign in. Check your email and password, or ask the administrator to confirm your access."),
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (checkingAccess) return;
    setError(null);
    setSessionBlocked(false);
    login.mutate({ email: email.trim(), password });
  };

  const ownerSignIn = () => {
    try {
      sessionStorage.setItem("dataRoomReturnTo", "/data-room/admin");
    } catch {
      // The login flow still works when browser storage is unavailable.
    }
    startLogin();
  };

  return (
    <DataRoomShell title="Investor Data Room">
      <main className="data-room-auth-page">
        <section className="data-room-auth-panel data-room-auth-panel-brand">
          <div className="data-room-auth-brand-content">
            <DataRoomBrand dark />
            <div className="data-room-auth-copy">
              <p className="data-room-kicker"><ShieldCheck size={14} /> Confidential investor access</p>
              <h1>One place for the documents that matter.</h1>
              <p>Property Hub Exchange shares investor materials here with authorized participants.</p>
            </div>
            <div className="data-room-auth-assurance"><LockKeyhole size={17} /><span>Private access is issued individually.</span></div>
          </div>
        </section>
        <section className="data-room-auth-panel data-room-auth-panel-form">
          <div className="data-room-auth-form-wrap">
            <p className="data-room-kicker data-room-kicker-green">Investor access</p>
            <h2>Sign in to the data room</h2>
            <p className="data-room-muted">Use your invited email address and the password you created.</p>
            <form onSubmit={submit} className="data-room-form" aria-busy={checkingAccess} noValidate>
              <div className="data-room-field">
                <Label htmlFor="data-room-email">Email</Label>
                <Input id="data-room-email" type="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" className="data-room-input" />
              </div>
              <div className="data-room-field">
                <Label htmlFor="password">Password</Label>
                <PasswordField value={password} onChange={setPassword} />
              </div>
              {error && <Alert variant="destructive" className="data-room-error"><AlertDescription>{error}</AlertDescription></Alert>}
              <Button type="submit" disabled={checkingAccess || login.isPending} className="data-room-primary-button">
                {login.isPending ? <LoaderCircle className="animate-spin" /> : <KeyRound />} Sign in
              </Button>
            </form>
            {(isEmbedded || sessionBlocked) && <div className="mt-4 rounded-xl border border-[#cfe0ca] bg-white p-3">
              <p className="text-xs leading-relaxed text-[#52695c]">Embedded previews can block secure sign-in cookies. Use a separate browser tab for reliable access to the data room.</p>
              <a href={standaloneSignInUrl} target="_blank" rel="noopener noreferrer" className="data-room-back-link mt-2">Open sign-in in a new tab <ArrowUpRight size={14} /></a>
            </div>}
            <div className="data-room-owner-signin">
              <span>Property Hub owner?</span>
              <button type="button" disabled={checkingAccess} onClick={ownerSignIn}>Sign in with owner account <ArrowUpRight size={14} /></button>
            </div>
            <a href="/" className="data-room-back-link"><ArrowLeft size={14} /> Back to Property Hub Exchange</a>
          </div>
        </section>
      </main>
    </DataRoomShell>
  );
}

function DocumentViewer({ document, onClose }: { document: DataRoomDocument | null; onClose: () => void }) {
  if (!document) return null;
  const viewUrl = `/api/data-room/documents/${document.id}?mode=view`;
  return (
    <Dialog open={Boolean(document)} onOpenChange={open => !open && onClose()}>
      <DialogContent showCloseButton={false} className="data-room-viewer-dialog">
        <DialogHeader className="data-room-viewer-header">
          <div className="min-w-0">
            <DialogTitle className="truncate font-display text-lg text-[#12352b]">{document.title}</DialogTitle>
            <DialogDescription className="mt-1">{document.filename} · Version {document.version}</DialogDescription>
          </div>
          <div className="data-room-viewer-actions">
            <a href={viewUrl} target="_blank" rel="noreferrer" className="data-room-icon-action" aria-label="Open PDF in a new tab"><ArrowUpRight size={17} /></a>
            <button type="button" onClick={onClose} className="data-room-icon-action" aria-label="Close document viewer"><X size={17} /></button>
          </div>
        </DialogHeader>
        <div className="data-room-viewer-frame-wrap">
          <iframe src={viewUrl} title={`View ${document.title}`} className="data-room-viewer-frame" />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Library({ name, isAdmin, onLogout }: { name: string; isAdmin: boolean; onLogout: () => void }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [viewerDocument, setViewerDocument] = useState<DataRoomDocument | null>(null);
  const documentsQuery = trpc.dataRoom.documents.list.useQuery();
  const documents = documentsQuery.data ?? [];
  const categories = useMemo(() => Array.from(new Set(documents.map(document => document.category).filter(Boolean))).sort(), [documents]);
  const visibleDocuments = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return documents.filter(document => {
      const matchesSearch = !query || document.title.toLocaleLowerCase().includes(query) || document.description.toLocaleLowerCase().includes(query);
      return matchesSearch && (category === "all" || document.category === category);
    });
  }, [category, documents, search]);

  return (
    <DataRoomShell title="Investor Library">
      <main className="data-room-library-page">
        <div className="data-room-library-topline">
          <div><p className="data-room-kicker data-room-kicker-green">Investor library</p><p className="data-room-welcome">Welcome back, {name || "Investor"}.</p></div>
          <div className="data-room-library-account">
            {isAdmin && <a href="/data-room/admin" className="data-room-manage-link">Manage room <ArrowUpRight size={14} /></a>}
            <button type="button" onClick={onLogout} className="data-room-text-button"><LogOut size={15} /> Sign out</button>
          </div>
        </div>
        <section className="data-room-library-hero">
          <div>
            <p className="data-room-kicker">Property Hub Exchange</p>
            <h1>Investor materials</h1>
            <p>Review the documents shared with you by the Property Hub Exchange team.</p>
          </div>
          <div className="data-room-library-hero-lock"><LockKeyhole size={22} /><span>Authorized investor access</span></div>
        </section>
        <section className="data-room-library-controls" aria-label="Filter documents">
          <div className="data-room-search"><Search size={17} /><Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search documents" aria-label="Search documents" /></div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="data-room-select"><SelectValue placeholder="All categories" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All categories</SelectItem>{categories.map(item => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
          </Select>
        </section>
        {documentsQuery.isLoading ? (
          <div className="data-room-document-grid" aria-label="Loading documents"><Skeleton className="h-48 rounded-2xl" /><Skeleton className="h-48 rounded-2xl" /><Skeleton className="h-48 rounded-2xl" /></div>
        ) : documentsQuery.error ? (
          <div className="data-room-empty-state"><FileSearch size={28} /><h2>Documents are unavailable right now</h2><p>Please refresh the page or try again in a moment.</p></div>
        ) : visibleDocuments.length === 0 ? (
          <div className="data-room-empty-state"><FolderOpen size={30} /><h2>{documents.length === 0 ? "No documents have been shared yet" : "No matching documents"}</h2><p>{documents.length === 0 ? "When materials are published for you, they will appear here." : "Try a different search or category."}</p></div>
        ) : (
          <div className="data-room-document-grid">
            {visibleDocuments.map(document => (
              <DocumentCard key={document.id} document={document} onView={() => setViewerDocument(document)} />
            ))}
          </div>
        )}
        <p className="data-room-confidential-note"><ShieldCheck size={15} /> <strong>Confidential · authorized investors only</strong><span>Documents can still be saved or shared by authorized viewers.</span></p>
      </main>
      <DocumentViewer document={viewerDocument} onClose={() => setViewerDocument(null)} />
    </DataRoomShell>
  );
}

function DocumentCard({ document, onView }: { document: DataRoomDocument; onView: () => void }) {
  const kind = documentKind(document.filename);
  const isExcel = kind === "xlsx" || kind === "xls";
  const description = isExcel
    ? `${document.description ? `${document.description} ` : ""}Download opens in Excel or a compatible application.`
    : document.description || "No description provided.";
  return (
    <article className="data-room-document-card">
      <div className="data-room-document-card-top"><span className="data-room-document-icon">{isExcel ? <FileSpreadsheet size={21} /> : <FileText size={21} />}</span><div className="flex flex-wrap justify-end gap-2"><Badge className="data-room-category-badge">{document.category || "Document"}</Badge>{isExcel && <Badge className="data-room-category-badge">Excel</Badge>}</div></div>
      <div className="min-w-0"><h2>{document.title}</h2><p>{description}</p></div>
      <div className="data-room-document-meta"><span>{formatDocumentSize(document.sizeBytes)}</span><span>Updated {formatDataRoomDate(document.updatedAt)}</span></div>
      <div className="data-room-document-actions">
        {isExcel ? document.allowDownload ? <a href={`/api/data-room/documents/${document.id}?mode=download`} className="data-room-download-button"><Download size={15} /> Download Excel</a> : <span className="data-room-muted">Download not enabled</span> : <><button type="button" onClick={onView} className="data-room-view-button"><FileText size={15} /> View</button>{document.allowDownload && <a href={`/api/data-room/documents/${document.id}?mode=download`} className="data-room-download-button"><Download size={15} /> Download</a>}</>}
      </div>
    </article>
  );
}

export default function DataRoom() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const meQuery = trpc.dataRoom.me.useQuery(undefined, { refetchInterval: 60_000, retry: false });
  const logout = trpc.dataRoom.logout.useMutation();

  const handleLogout = async () => {
    try {
      await logout.mutateAsync();
    } finally {
      try { sessionStorage.removeItem("manus-cookie"); } catch {}
      await utils.dataRoom.invalidate();
      setLocation("/data-room");
    }
  };

  if (!meQuery.data) return <PasswordLogin checkingAccess={meQuery.isLoading} />;
  return <Library name={meQuery.data.name} isAdmin={meQuery.data.role === "admin"} onLogout={handleLogout} />;
}

export function DataRoomAcceptInvite() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const token = new URLSearchParams(window.location.hash.replace(/^#/, "")).get("token") ?? "";
  const invitation = trpc.dataRoom.inviteInfo.useQuery({ token }, { enabled: Boolean(token), retry: false });
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const accept = trpc.dataRoom.acceptInvite.useMutation({
    onSuccess: async () => {
      await utils.dataRoom.me.invalidate();
      setLocation("/data-room");
    },
    onError: () => setError(readableError()),
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password.length < 12 || password.length > 128) {
      setError("Choose a password between 12 and 128 characters.");
      return;
    }
    setError(null);
    accept.mutate({ token, password });
  };

  return (
    <DataRoomShell title="Accept Investor Invitation">
      <main className="data-room-invite-page">
        <section className="data-room-invite-card">
          <span className="data-room-invite-icon"><UserRound size={23} /></span>
          {!token ? <>
            <p className="data-room-kicker data-room-kicker-green">Invitation required</p>
            <h1>This invitation link is incomplete</h1>
            <p>Please use the complete private link shared with you by the Property Hub Exchange team.</p>
            <a href="/data-room" className="data-room-primary-link">Go to sign in</a>
          </> : invitation.isLoading ? <><h1>Checking your invitation</h1><p className="data-room-muted">Please wait a moment.</p></> : invitation.error || !invitation.data ? <>
            <p className="data-room-kicker data-room-kicker-green">Invitation unavailable</p>
            <h1>This invitation can’t be used</h1>
            <p>The invitation may have expired, been replaced, or already been completed. Ask the room administrator for a new link.</p>
            <a href="/data-room" className="data-room-primary-link">Go to sign in</a>
          </> : <>
            <p className="data-room-kicker data-room-kicker-green">Investor invitation</p>
            <h1>Welcome, {invitation.data.name}.</h1>
            <p>Create your private password to access Property Hub Exchange investor materials as <strong>{invitation.data.email}</strong>.</p>
            <form onSubmit={submit} className="data-room-form data-room-invite-form">
              <div className="data-room-field"><Label htmlFor="invite-password">Create password</Label><PasswordField id="invite-password" value={password} onChange={setPassword} autoComplete="new-password" /></div>
              <p className="data-room-password-hint">12–128 characters</p>
              {error && <Alert variant="destructive" className="data-room-error"><AlertDescription>{error}</AlertDescription></Alert>}
              <Button type="submit" disabled={accept.isPending} className="data-room-primary-button">{accept.isPending ? <LoaderCircle className="animate-spin" /> : <CheckCircle2 />} Activate access</Button>
            </form>
          </>}
        </section>
      </main>
    </DataRoomShell>
  );
}
