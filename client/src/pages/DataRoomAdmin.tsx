import DashboardLayout, { DataRoomAdminSection } from "@/components/DashboardLayout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { DATA_ROOM_LOGO, DOCUMENT_CATEGORIES, DataRoomDocument, DataRoomInvestor, MAX_DOCUMENT_BYTES, dateTimeLocalToUtc, documentKind, formatDataRoomDate, formatDocumentSize, readDocumentAsBase64, toDateTimeLocal, useDataRoomMetadata } from "@/lib/dataRoom";
import { DOCUMENT_CHUNK_BYTES, DocumentTransferError, documentTransferErrorMessage, isTransferCancelled } from "@/lib/dataRoomTransfers";
import { trpc } from "@/lib/trpc";
import {
  Activity,
  Archive,
  Check,
  Clipboard,
  Clock3,
  Copy,
  FilePlus2,
  FileText,
  Link,
  LoaderCircle,
  Mail,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Send,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  Upload,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";

type InviteLink = { token: string; name: string; email: string } | null;
type DocumentDialogState = { mode: "upload" | "replace" | "edit"; document?: DataRoomDocument } | null;

const genericError = "We couldn’t complete that request. Please try again.";

function PageHeading({ eyebrow, title, children, action }: { eyebrow?: string; title: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return <div className="data-room-admin-heading"><div><p className="data-room-kicker data-room-kicker-green">{eyebrow}</p><h1>{title}</h1>{children && <p>{children}</p>}</div>{action}</div>;
}

function InlineError({ error }: { error: string | null }) {
  return error ? <Alert variant="destructive" className="data-room-error"><AlertDescription>{error}</AlertDescription></Alert> : null;
}

function Metric({ icon: Icon, label, value, detail }: { icon: typeof FileText; label: string; value: number; detail: string }) {
  return <article className="data-room-metric"><span><Icon size={18} /></span><div><p>{label}</p><strong>{value}</strong><small>{detail}</small></div></article>;
}

function AdminOverview() {
  const overview = trpc.dataRoom.admin.overview.useQuery();
  if (overview.isLoading) return <div className="data-room-metrics"><Skeleton className="h-32 rounded-xl" /><Skeleton className="h-32 rounded-xl" /><Skeleton className="h-32 rounded-xl" /></div>;
  if (overview.error || !overview.data) return null;
  return <div className="data-room-metrics">
    <Metric icon={FileText} label="Documents" value={overview.data.documents} detail="Available in the room" />
    <Metric icon={Users} label="Active investors" value={overview.data.activeInvestors} detail="Current authorized access" />
    <Metric icon={Clock3} label="Pending invitations" value={overview.data.pendingInvites} detail="Not yet activated" />
  </div>;
}

function DocumentEditor({ state, onClose, onSaved }: { state: DocumentDialogState; onClose: () => void; onSaved: () => Promise<void> }) {
  const existing = state?.document;
  const [title, setTitle] = useState(existing?.title ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [category, setCategory] = useState(existing?.category ?? DOCUMENT_CATEGORIES[0]);
  const [file, setFile] = useState<File | null>(null);
  const [allowDownload, setAllowDownload] = useState(existing?.allowDownload ?? true);
  const [published, setPublished] = useState(existing?.published ?? true);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "starting" | "uploading" | "finalizing" | "cancelling">("idle");
  const [progress, setProgress] = useState(0);
  const [saved, setSaved] = useState(false);
  const operation = useRef<{ cancelled: boolean; uploadId: string | null; phase: "starting" | "uploading" | "finalizing" } | null>(null);
  const busy = useRef(false);
  const mounted = useRef(true);
  const beginUpload = trpc.dataRoom.admin.beginDocumentUpload.useMutation();
  const uploadChunk = trpc.dataRoom.admin.uploadDocumentChunk.useMutation();
  const completeUpload = trpc.dataRoom.admin.completeDocumentUpload.useMutation();
  const cancelUpload = trpc.dataRoom.admin.cancelDocumentUpload.useMutation();
  const cancelMutation = useRef(cancelUpload.mutateAsync);
  cancelMutation.current = cancelUpload.mutateAsync;
  const update = trpc.dataRoom.admin.updateDocument.useMutation();
  const isEdit = state?.mode === "edit";
  const isReplace = state?.mode === "replace";

  useEffect(() => {
    mounted.current = true;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (busy.current) { event.preventDefault(); event.returnValue = ""; }
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      mounted.current = false;
      window.removeEventListener("beforeunload", beforeUnload);
      const active = operation.current;
      if (active && active.phase !== "finalizing") {
        active.cancelled = true;
        if (active.uploadId) void cancelMutation.current({ uploadId: active.uploadId }).catch(() => {});
      }
    };
  }, []);

  if (!state) return null;
  const pending = phase !== "idle" || update.isPending;
  const requestClose = () => { if (!busy.current) onClose(); };
  const cancelTransfer = () => {
    const active = operation.current;
    if (!active || active.phase === "finalizing" || active.cancelled) return;
    active.cancelled = true;
    setPhase("cancelling");
  };
  const setSelectedFile = (candidate: File | null) => {
    if (busy.current) return;
    setFile(null);
    if (!candidate) { setFile(null); return; }
    if (!documentKind(candidate.name)) { setError("Please choose a PDF or Excel file."); return; }
    if (!Number.isSafeInteger(candidate.size) || candidate.size < 1) { setError("The selected file is empty. Choose a PDF or Excel file containing data."); return; }
    const count = Math.ceil(candidate.size / DOCUMENT_CHUNK_BYTES);
    if (candidate.size > MAX_DOCUMENT_BYTES || count > 15) { setError("PDF or Excel files must be 15 MB (15 MiB) or smaller, with no more than 15 upload chunks."); return; }
    setError(null);
    setFile(candidate);
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy.current || saved) return;
    if (!title.trim()) { setError("A document title is required."); return; }
    setError(null);
    if (isEdit) {
      busy.current = true;
      try {
        await update.mutateAsync({ id: existing!.id, title: title.trim(), description: description.trim(), category: category.trim(), allowDownload, published });
        setSaved(true);
        await onSaved();
        onClose();
      } catch (error) {
        if (mounted.current) setError(documentTransferErrorMessage(error));
      } finally { busy.current = false; }
      return;
    }
    if (!file) { setError(isReplace ? "Choose the replacement PDF or Excel file." : "Choose a PDF or Excel file to upload."); return; }
    const selectedFile = file;
    const totalChunks = Math.ceil(selectedFile.size / DOCUMENT_CHUNK_BYTES);
    if (selectedFile.size < 1 || selectedFile.size > MAX_DOCUMENT_BYTES || totalChunks < 1 || totalChunks > 15) { setError("Choose a non-empty PDF or Excel file of 15 MB (15 MiB) or less (1–15 chunks)."); return; }
    const active = { cancelled: false, uploadId: null as string | null, phase: "starting" as "starting" | "uploading" | "finalizing" };
    operation.current = active;
    busy.current = true;
    setPhase("starting");
    setProgress(0);
    const checkCancelled = () => { if (active.cancelled) throw new DOMException("Upload cancelled.", "AbortError"); };
    try {
      const started = await beginUpload.mutateAsync({
        title: title.trim(), description: description.trim(), category: category.trim(), filename: selectedFile.name,
        sizeBytes: selectedFile.size, allowDownload, published, ...(isReplace ? { replaceId: existing!.id } : {}),
      });
      active.uploadId = started.uploadId;
      checkCancelled();
      if (started.chunkBytes !== DOCUMENT_CHUNK_BYTES || started.totalChunks !== totalChunks) {
        throw new DocumentTransferError("The server returned an unsupported upload chunk size or count. Please try again or contact the administrator.");
      }
      active.phase = "uploading";
      if (mounted.current) setPhase("uploading");
      for (let index = 0; index < totalChunks; index += 1) {
        checkCancelled();
        const start = index * DOCUMENT_CHUNK_BYTES;
        const slice = selectedFile.slice(start, Math.min(start + DOCUMENT_CHUNK_BYTES, selectedFile.size));
        // Preserve the existing reader API while only reading this bounded slice.
        let base64: string;
        try { base64 = await readDocumentAsBase64(new File([slice], selectedFile.name, { type: selectedFile.type })); }
        catch { throw new DocumentTransferError("The selected file could not be read. Choose the file again and retry the upload."); }
        checkCancelled();
        if (slice.size > DOCUMENT_CHUNK_BYTES || base64.length !== 4 * Math.ceil(slice.size / 3)) {
          throw new DocumentTransferError("A file chunk could not be encoded correctly. Choose the file again and retry.");
        }
        await uploadChunk.mutateAsync({ uploadId: started.uploadId, index, base64 });
        checkCancelled();
        if (mounted.current) setProgress(Math.floor(Math.min(start + slice.size, selectedFile.size) / selectedFile.size * 100));
      }
      checkCancelled();
      // From this point cancellation could race the atomic document replacement.
      active.phase = "finalizing";
      if (mounted.current) setPhase("finalizing");
      await completeUpload.mutateAsync({ uploadId: started.uploadId });
      active.uploadId = null;
      if (mounted.current) setSaved(true);
      await onSaved();
      if (mounted.current) onClose();
    } catch (error) {
      let cleanupFailed = false;
      if (active.uploadId && active.phase !== "finalizing") {
        try { await cancelUpload.mutateAsync({ uploadId: active.uploadId }); active.uploadId = null; }
        catch { cleanupFailed = true; }
      }
      if (mounted.current) {
        // A lost completion response must not produce a duplicate document on retry.
        if (active.phase === "finalizing") setSaved(true);
        if (isTransferCancelled(error) && !cleanupFailed) onClose();
        else setError(cleanupFailed
          ? "The upload stopped, but the server could not confirm cancellation. No new document was finalized. Refresh the page before trying again."
          : active.phase === "finalizing"
            ? `${documentTransferErrorMessage(error)} Finalization may have completed; refresh the document list before starting another upload.`
            : documentTransferErrorMessage(error));
      }
    } finally {
      operation.current = null;
      busy.current = false;
      if (mounted.current) setPhase("idle");
    }
  };
  const dialogTitle = isEdit ? "Edit document details" : isReplace ? `Replace “${existing?.title}”` : "Upload a document";
  return <Dialog open={Boolean(state)} onOpenChange={open => !open && requestClose()}>
    <DialogContent showCloseButton={false} className="data-room-form-dialog" onEscapeKeyDown={event => { if (busy.current) event.preventDefault(); }} onInteractOutside={event => { if (busy.current) event.preventDefault(); }}>
      <DialogHeader><div className="flex items-start justify-between gap-4"><div><DialogTitle className="font-display text-xl text-[#12352b]">{dialogTitle}</DialogTitle><DialogDescription className="mt-2">{isReplace ? "The file will be replaced and the document version will increase." : isEdit ? "Update access and document presentation details." : "PDF or Excel files only, up to 15 MB (15 MiB)."}</DialogDescription></div><button type="button" disabled={pending} onClick={requestClose} className="data-room-icon-action" aria-label="Close"><X size={17} /></button></div></DialogHeader>
      <form onSubmit={submit} className="data-room-form" aria-busy={pending}>
        <fieldset disabled={pending || saved} className="data-room-upload-fields">
        <div className="data-room-form-grid"><div className="data-room-field"><Label htmlFor="document-title">Title</Label><Input id="document-title" required maxLength={160} value={title} onChange={event => setTitle(event.target.value)} className="data-room-input" /></div><div className="data-room-field"><Label htmlFor="document-category">Category</Label><Input id="document-category" list="data-room-categories" required maxLength={80} value={category} onChange={event => setCategory(event.target.value)} className="data-room-input" /><datalist id="data-room-categories">{DOCUMENT_CATEGORIES.map(item => <option value={item} key={item} />)}</datalist></div></div>
        <div className="data-room-field"><Label htmlFor="document-description">Description <span className="data-room-label-optional">Optional</span></Label><Textarea id="document-description" maxLength={1000} value={description} onChange={event => setDescription(event.target.value)} className="data-room-textarea" /></div>
        {!isEdit && <div className="data-room-field"><Label htmlFor="document-file">PDF or Excel file</Label><label className="data-room-file-input" htmlFor="document-file"><Upload size={17} /><span>{file ? file.name : isReplace ? "Choose replacement PDF or Excel" : "Choose PDF or Excel"}</span><input id="document-file" type="file" accept="application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,.pdf,.xlsx,.xls" onChange={event => setSelectedFile(event.target.files?.[0] ?? null)} /></label>{file && <small className="data-room-file-note">{formatDocumentSize(file.size)}</small>}</div>}
        <div className="data-room-checkbox-row"><label><input type="checkbox" checked={allowDownload} onChange={event => setAllowDownload(event.target.checked)} /> <span>Allow download</span></label><label><input type="checkbox" checked={published} onChange={event => setPublished(event.target.checked)} /> <span>Publish to investors</span></label></div>
        {!published && <p className="data-room-draft-note">This document will remain a draft and won’t be visible in the investor library.</p>}
        </fieldset>
        {phase !== "idle" && <div className="data-room-upload-progress" role="status" aria-live="polite"><span>{phase === "starting" ? "Preparing secure upload… 0%" : phase === "uploading" ? `Uploading… ${progress}%` : phase === "cancelling" ? "Cancelling upload safely…" : "Finalizing document… 100%. Please keep this window open."}</span><progress value={progress} max={100} aria-label="Document upload progress" /></div>}
        <InlineError error={error} />
        <DialogFooter><Button type="button" variant="outline" disabled={phase === "finalizing" || phase === "cancelling" || update.isPending} onClick={pending ? cancelTransfer : requestClose}>{phase === "cancelling" ? "Cancelling…" : pending ? "Cancel upload" : saved ? "Close" : "Cancel"}</Button><Button type="submit" disabled={pending || saved} className="data-room-primary-button">{pending ? <LoaderCircle className="animate-spin" /> : isEdit ? <Pencil /> : <Upload />}{phase === "finalizing" ? "Finalizing…" : phase === "uploading" ? `Uploading… ${progress}%` : isEdit ? "Save changes" : isReplace ? "Replace document" : "Upload document"}</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}

function DocumentsSection() {
  const utils = trpc.useUtils();
  const documents = trpc.dataRoom.admin.documents.useQuery();
  const [dialog, setDialog] = useState<DocumentDialogState>(null);
  const [archiveTarget, setArchiveTarget] = useState<DataRoomDocument | null>(null);
  const [error, setError] = useState<string | null>(null);
  const archive = trpc.dataRoom.admin.archiveDocument.useMutation({
    onSuccess: async () => { await utils.dataRoom.admin.documents.invalidate(); await utils.dataRoom.admin.overview.invalidate(); setArchiveTarget(null); },
    onError: () => setError(genericError),
  });
  const refresh = async () => { await Promise.all([utils.dataRoom.admin.documents.invalidate(), utils.dataRoom.admin.overview.invalidate()]); };
  return <section>
    <PageHeading eyebrow="Room content" title="Documents" action={<Button onClick={() => setDialog({ mode: "upload" })} className="data-room-primary-button"><FilePlus2 /> Upload document</Button>}>Manage the materials available to authorized investors.</PageHeading>
    <AdminOverview />
    <InlineError error={error} />
    <div className="data-room-admin-card data-room-documents-card">
      {documents.isLoading ? <div className="space-y-3"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div> : documents.error ? <div className="data-room-empty-state"><ShieldAlert size={28} /><h2>Documents are unavailable right now</h2><p>Refresh the page or try again in a moment.</p></div> : (documents.data ?? []).length === 0 ? <div className="data-room-empty-state"><FileText size={30} /><h2>No documents yet</h2><p>Upload a PDF or Excel file to begin assembling the investor library.</p><Button onClick={() => setDialog({ mode: "upload" })} className="data-room-primary-button">Upload document</Button></div> : <div className="data-room-admin-list">{documents.data!.map(document => <article className="data-room-admin-document" key={document.id}><span className="data-room-document-icon"><FileText size={19} /></span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2>{document.title}</h2><Badge className={document.published ? "data-room-status-active" : "data-room-status-draft"}>{document.published ? "Published" : "Draft"}</Badge></div><p>{document.category || "Uncategorized"} · {document.filename} · {formatDocumentSize(document.sizeBytes)} · v{document.version}</p></div><div className="data-room-document-admin-actions"><button type="button" onClick={() => setDialog({ mode: "edit", document })} title="Edit document details"><Pencil size={15} /><span>Edit</span></button><button type="button" onClick={() => setDialog({ mode: "replace", document })} title="Replace document PDF or Excel file"><RefreshCw size={15} /><span>Replace</span></button><button type="button" className="data-room-danger-text" onClick={() => setArchiveTarget(document)} title="Archive document"><Archive size={15} /><span>Archive</span></button></div></article>)}</div>}
    </div>
    {dialog && <DocumentEditor key={`${dialog.mode}-${dialog.document?.id ?? "new"}`} state={dialog} onClose={() => setDialog(null)} onSaved={refresh} />}
    <AlertDialog open={Boolean(archiveTarget)} onOpenChange={open => !open && setArchiveTarget(null)}><AlertDialogContent className="data-room-alert"><AlertDialogHeader><AlertDialogTitle>Archive this document?</AlertDialogTitle><AlertDialogDescription>“{archiveTarget?.title}” will be removed from the room. This action archives the document rather than deleting it.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => archiveTarget && archive.mutate({ id: archiveTarget.id })} className="bg-[#a53a39] hover:bg-[#8e2f2e]">{archive.isPending ? "Archiving…" : "Archive document"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </section>;
}

function InviteLinkDialog({ invite, onClose }: { invite: InviteLink; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  if (!invite) return null;
  const url = `${window.location.origin}/data-room/accept#token=${invite.token}`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); } catch { setCopied(false); }
  };
  const mailto = `mailto:${encodeURIComponent(invite.email)}?subject=${encodeURIComponent("Your Property Hub Exchange investor room invitation")}&body=${encodeURIComponent(`Hello ${invite.name},\n\nUse this private link to create your investor room password:\n${url}`)}`;
  return <Dialog open={Boolean(invite)} onOpenChange={open => !open && onClose()}><DialogContent showCloseButton={false} className="data-room-form-dialog"><DialogHeader><div className="flex items-start justify-between gap-4"><div><DialogTitle className="font-display text-xl text-[#12352b]">Invitation ready</DialogTitle><DialogDescription className="mt-2">Share this private link with {invite.name} at {invite.email}. No email has been sent automatically.</DialogDescription></div><button type="button" onClick={onClose} className="data-room-icon-action" aria-label="Close"><X size={17} /></button></div></DialogHeader><div className="data-room-invite-link"><Link size={17} /><code>{url}</code></div><DialogFooter><a href={mailto} className="data-room-secondary-button"><Mail size={15} /> Draft email</a><Button onClick={copy} className="data-room-primary-button">{copied ? <Check /> : <Copy />}{copied ? "Copied" : "Copy link"}</Button></DialogFooter></DialogContent></Dialog>;
}

function InvestorsSection() {
  const utils = trpc.useUtils();
  const investors = trpc.dataRoom.admin.investors.useQuery();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteLink, setInviteLink] = useState<InviteLink>(null);
  const [revokeTarget, setRevokeTarget] = useState<DataRoomInvestor | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const invite = trpc.dataRoom.admin.invite.useMutation({
    onSuccess: async response => { await utils.dataRoom.admin.investors.invalidate(); await utils.dataRoom.admin.overview.invalidate(); setInviteOpen(false); setName(""); setEmail(""); setExpiresAt(""); setInviteLink(response); },
    onError: () => setError(genericError),
  });
  const reset = trpc.dataRoom.admin.resetInvite.useMutation({
    onSuccess: async response => { await utils.dataRoom.admin.investors.invalidate(); setInviteLink(response); },
    onError: () => setError(genericError),
  });
  const access = trpc.dataRoom.admin.setInvestorAccess.useMutation({
    onSuccess: async () => { await utils.dataRoom.admin.investors.invalidate(); await utils.dataRoom.admin.overview.invalidate(); setRevokeTarget(null); },
    onError: () => setError(genericError),
  });
  const submitInvite = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const timestamp = dateTimeLocalToUtc(expiresAt);
    if (expiresAt && timestamp === null) { setError("Choose a valid expiration date and time."); return; }
    setError(null); invite.mutate({ name: name.trim(), email: email.trim(), expiresAt: timestamp });
  };
  return <section>
    <PageHeading eyebrow="Access management" title="Investors" action={<Button onClick={() => { setError(null); setInviteOpen(true); }} className="data-room-primary-button"><UserPlus /> Invite investor</Button>}>Invite participants and manage access to the investor library.</PageHeading>
    <InlineError error={error} />
    <div className="data-room-admin-card">
      {investors.isLoading ? <div className="space-y-3"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div> : investors.error ? <div className="data-room-empty-state"><ShieldAlert size={28} /><h2>Investor access is unavailable</h2><p>Please refresh the page or try again shortly.</p></div> : (investors.data ?? []).length === 0 ? <div className="data-room-empty-state"><Users size={30} /><h2>No investors have been invited</h2><p>Invite an investor to create a private access link.</p><Button onClick={() => setInviteOpen(true)} className="data-room-primary-button">Invite investor</Button></div> : <div className="data-room-investor-table">{investors.data!.map(investor => <InvestorRow key={investor.id} investor={investor} onReset={() => reset.mutate({ id: investor.id })} onRevoke={() => setRevokeTarget(investor)} onRestore={() => access.mutate({ id: investor.id, status: "active", expiresAt: investor.expiresAt })} onSaveExpiry={expires => access.mutate({ id: investor.id, status: investor.status, expiresAt: expires })} loading={reset.isPending || access.isPending} />)}</div>}
    </div>
    <Dialog open={inviteOpen} onOpenChange={open => { setInviteOpen(open); if (!open) setError(null); }}><DialogContent showCloseButton={false} className="data-room-form-dialog"><DialogHeader><div className="flex items-start justify-between gap-4"><div><DialogTitle className="font-display text-xl text-[#12352b]">Invite an investor</DialogTitle><DialogDescription className="mt-2">Generate a private setup link. You’ll choose how to share it.</DialogDescription></div><button type="button" onClick={() => setInviteOpen(false)} className="data-room-icon-action" aria-label="Close"><X size={17} /></button></div></DialogHeader><form onSubmit={submitInvite} className="data-room-form"><div className="data-room-form-grid"><div className="data-room-field"><Label htmlFor="investor-name">Name</Label><Input id="investor-name" required maxLength={120} value={name} onChange={event => setName(event.target.value)} className="data-room-input" /></div><div className="data-room-field"><Label htmlFor="investor-email">Email</Label><Input id="investor-email" type="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} className="data-room-input" /></div></div><div className="data-room-field"><Label htmlFor="investor-expiration">Access expiration <span className="data-room-label-optional">Optional</span></Label><Input id="investor-expiration" type="datetime-local" value={expiresAt} onChange={event => setExpiresAt(event.target.value)} className="data-room-input" /></div><InlineError error={error} /><DialogFooter><Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button><Button type="submit" disabled={invite.isPending} className="data-room-primary-button">{invite.isPending ? <LoaderCircle className="animate-spin" /> : <Send />} Create invitation</Button></DialogFooter></form></DialogContent></Dialog>
    <InviteLinkDialog invite={inviteLink} onClose={() => setInviteLink(null)} />
    <AlertDialog open={Boolean(revokeTarget)} onOpenChange={open => !open && setRevokeTarget(null)}><AlertDialogContent className="data-room-alert"><AlertDialogHeader><AlertDialogTitle>Revoke investor access?</AlertDialogTitle><AlertDialogDescription>{revokeTarget?.name} ({revokeTarget?.email}) will no longer be able to access the investor room.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => revokeTarget && access.mutate({ id: revokeTarget.id, status: "revoked", expiresAt: revokeTarget.expiresAt })} className="bg-[#a53a39] hover:bg-[#8e2f2e]">{access.isPending ? "Revoking…" : "Revoke access"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </section>;
}

function InvestorRow({ investor, onReset, onRevoke, onRestore, onSaveExpiry, loading }: { investor: DataRoomInvestor; onReset: () => void; onRevoke: () => void; onRestore: () => void; onSaveExpiry: (expires: number | null) => void; loading: boolean }) {
  const [expiration, setExpiration] = useState(toDateTimeLocal(investor.expiresAt));
  const [resetOpen, setResetOpen] = useState(false);
  const [expirationError, setExpirationError] = useState<string | null>(null);
  const expired = investor.expiresAt !== null && investor.expiresAt <= Date.now();
  const statusClass = expired ? "data-room-status-revoked" : investor.status === "active" ? "data-room-status-active" : investor.status === "invited" ? "data-room-status-invited" : "data-room-status-revoked";
  const save = () => {
    const value = dateTimeLocalToUtc(expiration);
    if (expiration && (value === null || value <= Date.now())) { setExpirationError("Choose a future expiration date."); return; }
    setExpirationError(null); onSaveExpiry(value);
  };
  return <>
    <article className="data-room-investor-row">
      <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2>{investor.name}</h2><Badge className={statusClass}>{expired ? "expired" : investor.status}</Badge></div><p>{investor.email}</p><small>Invited {formatDataRoomDate(investor.createdAt)} · Last sign in {formatDataRoomDate(investor.lastLoginAt)}</small></div>
      <div className="data-room-investor-expiry"><Label htmlFor={`expiry-${investor.id}`}>Expires</Label><div><Input id={`expiry-${investor.id}`} type="datetime-local" value={expiration} onChange={event => setExpiration(event.target.value)} className="data-room-expiry-input" /><button type="button" disabled={loading} onClick={save}>Save</button></div>{expirationError && <small className="data-room-danger-text">{expirationError}</small>}</div>
      <div className="data-room-investor-actions">
        <button type="button" disabled={loading} onClick={() => setResetOpen(true)}><RefreshCw size={14} /> Renew invitation</button>
        {investor.status !== "revoked" && <button type="button" disabled={loading} className="data-room-danger-text" onClick={onRevoke}><ShieldAlert size={14} /> Revoke</button>}
        {investor.status === "revoked" && <button type="button" disabled={loading} onClick={onRestore}><ShieldCheck size={14} /> Restore access</button>}
      </div>
    </article>
    <AlertDialog open={resetOpen} onOpenChange={setResetOpen}><AlertDialogContent className="data-room-alert"><AlertDialogHeader><AlertDialogTitle>Renew this investor’s invitation?</AlertDialogTitle><AlertDialogDescription>{investor.name} will receive a new setup link. Their existing password, sessions and previous invitation will stop working until they choose a new password. Extend an expired access date first.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { setResetOpen(false); onReset(); }} className="bg-[#12352b] hover:bg-[#205743]">Renew invitation</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </>;
}

function ActivitySection() {
  const activity = trpc.dataRoom.admin.activity.useQuery();
  return <section><PageHeading eyebrow="Room history" title="Activity">Recent administration and investor room events.</PageHeading><div className="data-room-admin-card">{activity.isLoading ? <div className="space-y-4"><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /></div> : activity.error ? <div className="data-room-empty-state"><ShieldAlert size={28} /><h2>Activity is unavailable right now</h2><p>Please refresh the page or try again later.</p></div> : (activity.data ?? []).length === 0 ? <div className="data-room-empty-state"><Activity size={30} /><h2>No activity yet</h2><p>Actions in the investor room will appear here.</p></div> : <div className="data-room-activity-list">{activity.data!.map(item => <article key={item.id}><span><Clock3 size={15} /></span><div><p><strong>{item.actor}</strong> {item.event}</p><small>{item.detail}</small></div><time>{formatDataRoomDate(item.createdAt, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}</time></article>)}</div>}</div></section>;
}

function SettingsSection({ authSource, isOwner }: { authSource: "owner" | "password"; isOwner: boolean }) {
  const utils = trpc.useUtils();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [setupName, setSetupName] = useState("");
  const [setupEmail, setSetupEmail] = useState("");
  const [setupPassword, setSetupPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const change = trpc.dataRoom.changePassword.useMutation({ onSuccess: () => { setCurrentPassword(""); setNewPassword(""); setMessage("Password updated."); }, onError: () => setError(genericError) });
  const setup = trpc.dataRoom.setupAdmin.useMutation({ onSuccess: async () => { setSetupName(""); setSetupEmail(""); setSetupPassword(""); setMessage("Administrator email login is ready."); await utils.dataRoom.me.invalidate(); }, onError: () => setError(genericError) });
  const submitChange = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (newPassword.length < 12 || newPassword.length > 128) { setError("Choose a password between 12 and 128 characters."); return; } setError(null); setMessage(null); change.mutate({ currentPassword, newPassword }); };
  const submitSetup = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (setupPassword.length < 12 || setupPassword.length > 128) { setError("Choose a password between 12 and 128 characters."); return; } setError(null); setMessage(null); setup.mutate({ name: setupName.trim(), email: setupEmail.trim(), password: setupPassword }); };
  return <section><PageHeading eyebrow="Room settings" title="Settings">Manage administrator access for this investor room.</PageHeading><div className="data-room-settings-grid">{authSource === "password" && <article className="data-room-admin-card data-room-settings-card"><div className="data-room-settings-card-heading"><span><Settings2 size={18} /></span><div><h2>Change password</h2><p>Update the password for your room administrator login.</p></div></div><form className="data-room-form" onSubmit={submitChange}><div className="data-room-field"><Label htmlFor="current-password">Current password</Label><Input id="current-password" type="password" minLength={12} maxLength={128} required value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} className="data-room-input" autoComplete="current-password" /></div><div className="data-room-field"><Label htmlFor="new-password">New password</Label><Input id="new-password" type="password" minLength={12} maxLength={128} required value={newPassword} onChange={event => setNewPassword(event.target.value)} className="data-room-input" autoComplete="new-password" /></div><Button type="submit" disabled={change.isPending} className="data-room-primary-button">{change.isPending ? <LoaderCircle className="animate-spin" /> : <Check />} Save new password</Button></form></article>}{authSource === "owner" && isOwner && <article className="data-room-admin-card data-room-settings-card"><div className="data-room-settings-card-heading"><span><Users size={18} /></span><div><h2>Set up administrator email login</h2><p>Create an email-and-password administrator login for this investor room.</p></div></div><form className="data-room-form" onSubmit={submitSetup}><div className="data-room-form-grid"><div className="data-room-field"><Label htmlFor="setup-name">Administrator name</Label><Input id="setup-name" required maxLength={120} value={setupName} onChange={event => setSetupName(event.target.value)} className="data-room-input" /></div><div className="data-room-field"><Label htmlFor="setup-email">Administrator email</Label><Input id="setup-email" type="email" required maxLength={254} value={setupEmail} onChange={event => setSetupEmail(event.target.value)} className="data-room-input" /></div></div><div className="data-room-field"><Label htmlFor="setup-password">Password</Label><Input id="setup-password" type="password" minLength={12} maxLength={128} required value={setupPassword} onChange={event => setSetupPassword(event.target.value)} className="data-room-input" autoComplete="new-password" /></div><Button type="submit" disabled={setup.isPending} className="data-room-primary-button">{setup.isPending ? <LoaderCircle className="animate-spin" /> : <Check />} Set up email login</Button></form></article>}</div>{message && <Alert className="data-room-success"><Check size={15} /><AlertDescription>{message}</AlertDescription></Alert>}<InlineError error={error} /></section>;
}

function AccessDenied() {
  return <div className="data-room-admin-denied"><img src={DATA_ROOM_LOGO} alt="Property Hub Exchange" /><ShieldAlert size={30} /><h1>Administrator access required</h1><p>Your account does not have access to manage the investor data room.</p><a href="/data-room" className="data-room-primary-link">Return to investor room</a></div>;
}

export default function DataRoomAdmin() {
  useDataRoomMetadata("Property Hub Exchange | Investor Data Room Administration");
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [section, setSection] = useState<DataRoomAdminSection>("documents");
  const me = trpc.dataRoom.me.useQuery(undefined, { refetchInterval: 60_000, retry: false });
  const logout = trpc.dataRoom.logout.useMutation();
  const handleLogout = async () => {
    try { await logout.mutateAsync(); } finally { try { sessionStorage.removeItem("manus-cookie"); } catch {} await utils.dataRoom.invalidate(); setLocation("/data-room"); }
  };
  if (me.isLoading) return <div className="data-room-admin-loading"><LoaderCircle className="animate-spin" /> Checking administrator access</div>;
  if (!me.data || me.data.role !== "admin") return <AccessDenied />;
  const content = section === "documents" ? <DocumentsSection /> : section === "investors" ? <InvestorsSection /> : section === "activity" ? <ActivitySection /> : <SettingsSection authSource={me.data.authSource} isOwner={me.data.id === 0} />;
  return <DashboardLayout activeSection={section} onSectionChange={setSection} admin={{ name: me.data.name, email: me.data.email }} onLogout={handleLogout}>{content}</DashboardLayout>;
}
