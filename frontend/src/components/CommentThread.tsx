export default function CommentThread({ comments }: { comments: any[] }) {
  return (
    <div className="space-y-2">
      {comments.map((c) => (
        <div key={c.id} className="border-l pl-2">
          <div className="text-sm"><span className="font-medium">{c.authorUid}</span>: {c.body}</div>
        </div>
      ))}
    </div>
  )
}
