import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Session } from "@supabase/supabase-js";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  MessageSquare, 
  Reply, 
  Trash2, 
  Flag, 
  MoreVertical,
  AlertTriangle
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Comment {
  id: string;
  campaign_id: string;
  user_id: string;
  parent_id: string | null;
  body: string;
  created_at: string;
  is_hidden: boolean;
  profiles: {
    full_name: string;
    avatar_url: string;
    email?: string;
  };
  replies?: Comment[];
}

interface CommentSectionProps {
  campaignId: string;
  session: Session | null;
}

export default function CommentSection({ campaignId, session }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [isReporting, setIsReporting] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("");

  useEffect(() => {
    fetchComments();
  }, [campaignId]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("comments")
        .select(`
          *,
          profiles:user_id (full_name, avatar_url)
        `)
        .eq("campaign_id", campaignId)
        .eq("is_hidden", false)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Organize into threads
      const commentMap: { [key: string]: Comment } = {};
      const roots: Comment[] = [];

      data?.forEach(comment => {
        comment.replies = [];
        commentMap[comment.id] = comment;
      });

      data?.forEach(comment => {
        if (comment.parent_id && commentMap[comment.parent_id]) {
          commentMap[comment.parent_id].replies?.push(comment);
        } else {
          roots.push(comment);
        }
      });

      setComments(roots);
    } catch (error: any) {
      console.error("Error fetching comments:", error);
      toast.error("Failed to load comments");
    } finally {
      setLoading(false);
    }
  };

  const handlePostComment = async (parentId: string | null = null) => {
    if (!session) {
      toast.error("Please log in to comment");
      return;
    }

    const body = parentId ? replyBody : newComment;
    if (!body.trim()) return;

    try {
      const { data, error } = await supabase
        .from("comments")
        .insert({
          campaign_id: campaignId,
          user_id: session.user.id,
          parent_id: parentId,
          body: body
        })
        .select(`
          *,
          profiles:user_id (full_name, avatar_url)
        `)
        .single();

      if (error) throw error;

      toast.success(parentId ? "Reply posted!" : "Comment posted!");
      setNewComment("");
      setReplyBody("");
      setReplyingTo(null);
      fetchComments();
      
      // Trigger notification (simulated)
      if (parentId) {
        const parentComment = findCommentById(comments, parentId);
        if (parentComment && parentComment.user_id !== session.user.id) {
          // Send email to parent comment author
          await fetch("/api/send-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: parentComment.profiles.email, // We'd need to fetch this
              subject: "New reply to your comment",
              html: `<p>${session.user.user_metadata.full_name} replied to your comment on CrowdFund.</p>`
            })
          });
        }
      }
    } catch (error: any) {
      console.error("Error posting comment:", error);
      toast.error("Failed to post comment");
    }
  };

  const findCommentById = (list: Comment[], id: string): Comment | null => {
    for (const c of list) {
      if (c.id === id) return c;
      if (c.replies) {
        const found = findCommentById(c.replies, id);
        if (found) return found;
      }
    }
    return null;
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from("comments")
        .delete()
        .eq("id", commentId)
        .eq("user_id", session?.user.id);

      if (error) throw error;
      toast.success("Comment deleted");
      fetchComments();
    } catch (error: any) {
      toast.error("Failed to delete comment");
    }
  };

  const handleReportComment = async () => {
    if (!isReporting || !reportReason) return;

    try {
      const { error } = await supabase
        .from("comment_reports")
        .insert({
          comment_id: isReporting,
          user_id: session?.user.id,
          reason: reportReason
        });

      if (error) throw error;
      toast.success("Comment reported. Thank you.");
      setIsReporting(null);
      setReportReason("");
    } catch (error: any) {
      toast.error("Failed to report comment");
    }
  };

  const CommentItem = ({ comment, isReply = false }: { comment: Comment, isReply?: boolean }) => (
    <div className={`flex gap-4 ${isReply ? "ml-12 mt-4" : "mt-8"}`}>
      <Avatar className="h-10 w-10 shrink-0">
        <AvatarImage src={comment.profiles.avatar_url} />
        <AvatarFallback>{comment.profiles.full_name.charAt(0)}</AvatarFallback>
      </Avatar>
      <div className="flex-grow space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm">{comment.profiles.full_name}</span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
            </span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger render={
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            } />
            <DropdownMenuContent align="end">
              {session?.user.id === comment.user_id ? (
                <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteComment(comment.id)}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => setIsReporting(comment.id)}>
                  <Flag className="mr-2 h-4 w-4" /> Report
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <p className="text-sm leading-relaxed">{comment.body}</p>
        <div className="flex items-center gap-4">
          {!isReply && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-auto p-0 text-xs font-bold text-muted-foreground hover:text-primary"
              onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
            >
              <Reply className="mr-1 h-3 w-3" /> Reply
            </Button>
          )}
        </div>

        {replyingTo === comment.id && (
          <div className="mt-4 space-y-3">
            <Textarea 
              placeholder="Write a reply..." 
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              className="min-h-[80px] text-sm"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setReplyingTo(null)}>Cancel</Button>
              <Button size="sm" onClick={() => handlePostComment(comment.id)}>Post Reply</Button>
            </div>
          </div>
        )}

        {comment.replies?.map(reply => (
          <CommentItem key={reply.id} comment={reply} isReply />
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {session ? (
        <div className="space-y-4 bg-muted/30 p-6 rounded-2xl border">
          <div className="flex gap-4">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarImage src={session.user.user_metadata.avatar_url} />
              <AvatarFallback>{session.user.user_metadata.full_name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-grow space-y-4">
              <Textarea 
                placeholder="Share your thoughts or ask a question..." 
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[100px] bg-background"
              />
              <div className="flex justify-end">
                <Button className="font-bold" onClick={() => handlePostComment()}>
                  Post Comment
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center bg-muted/20 rounded-2xl border-2 border-dashed">
          <p className="text-muted-foreground font-medium mb-4">Please log in to join the conversation.</p>
          <Button variant="outline" className="font-bold" nativeButton={false} render={
            <Link to="/auth/login">Log In</Link>
          } />
        </div>
      )}

      <div className="divide-y">
        {loading ? (
          <div className="space-y-8 py-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-grow space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-20">
            <MessageSquare className="w-16 h-16 text-muted-foreground/30 mx-auto mb-6" />
            <h3 className="text-xl font-bold mb-2">No comments yet</h3>
            <p className="text-muted-foreground">Be the first to share your thoughts!</p>
          </div>
        ) : (
          comments.map(comment => (
            <CommentItem key={comment.id} comment={comment} />
          ))
        )}
      </div>

      <Dialog open={!!isReporting} onOpenChange={(open) => !open && setIsReporting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" /> Report Comment
            </DialogTitle>
            <DialogDescription>
              Help us understand what's wrong with this comment.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Reason</Label>
              <select 
                className="w-full p-2 rounded-md border bg-background"
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
              >
                <option value="">Select a reason...</option>
                <option value="spam">Spam or misleading</option>
                <option value="harassment">Harassment or hate speech</option>
                <option value="inappropriate">Inappropriate content</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReporting(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReportComment} disabled={!reportReason}>
              Submit Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
