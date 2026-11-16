import type { Status } from "@/lib/store";
const labels: Record<Status,string>={pending:"Menunggu",approved:"Disetujui",borrowed:"Dipinjam",late:"Terlambat",returned:"Dikembalikan",rejected:"Ditolak"};
export function StatusBadge({status}:{status:Status}){return <span className={`status ${status}`}>{labels[status]}</span>}
export function Panel({title,note,action,children}:{title:string;note?:string;action?:React.ReactNode;children:React.ReactNode}){return <section className="panel"><div className="panel-head"><div><h2>{title}</h2>{note?<p>{note}</p>:null}</div>{action}</div>{children}</section>}
export function Field({label,children,wide}:{label:string;children:React.ReactNode;wide?:boolean}){return <label className="field" style={wide?{gridColumn:"1 / -1"}:undefined}>{label}{children}</label>}
export function Empty({text}:{text:string}){return <p className="empty">{text}</p>}
