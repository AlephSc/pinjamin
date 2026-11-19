"use client";
import WorkspaceError from "@/app/components/WorkspaceError";
export default function Error(props: { error: Error & { digest?: string }; reset: () => void }) { return <WorkspaceError {...props} />; }
