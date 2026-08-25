import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Comment } from '../types';
import { 
  MessageSquare, 
  Send, 
  Heart, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Trash2, 
  CornerDownRight, 
  Reply, 
  X,
  Sparkles,
  ShieldCheck,
  Crown
} from 'lucide-react';

interface CommentSectionProps {
  comicId: string;
  comicTitle: string;
  chapterId?: string;
  chapterNumber?: number;
}

export const CommentSection: React.FC<CommentSectionProps> = ({
  comicId,
  comicTitle,
  chapterId,
  chapterNumber
}) => {
  const { 
    comments, 
    currentUser, 
    googleUser, 
    loginWithGoogle, 
    logoutGoogle, 
    openLoginModal,
    addComment, 
    toggleLikeComment, 
    deleteComment 
  } = useApp();

  const [newCommentText, setNewCommentText] = useState('');
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [unmaskedSpoilers, setUnmaskedSpoilers] = useState<Record<string, boolean>>({});
  const [replyingTo, setReplyingTo] = useState<{ id: string; username: string } | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replySpoiler, setReplySpoiler] = useState(false);

  const activeUser = googleUser || (currentUser ? {
    uid: currentUser.id,
    displayName: currentUser.username,
    email: `${currentUser.username}@antitimpa.id`,
    photoURL: currentUser.role === 'admin' 
      ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'
      : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80'
  } : null);

  // Filter comments for this comic
  const comicComments = comments.filter(c => c.comicId === comicId);

  // Separate root comments and child replies
  const rootComments = comicComments.filter(c => !c.replyToId);
  const getReplies = (parentId: string) => comicComments.filter(c => c.replyToId === parentId);

  const handleRootSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    if (!activeUser) {
      openLoginModal('Silakan masuk dengan akun pembaca atau Google untuk menulis komentar.');
      return;
    }

    addComment({
      comicId,
      chapterId,
      chapterNumber,
      content: newCommentText.trim(),
      spoiler: isSpoiler
    });

    setNewCommentText('');
    setIsSpoiler(false);
  };

  const handleReplySubmit = (parentId: string) => {
    if (!replyText.trim()) return;

    if (!activeUser) {
      openLoginModal('Silakan masuk dengan akun pembaca atau Google untuk membalas komentar.');
      return;
    }

    addComment({
      comicId,
      chapterId,
      chapterNumber,
      content: replyText.trim(),
      spoiler: replySpoiler,
      replyToId: parentId
    });

    setReplyText('');
    setReplySpoiler(false);
    setReplyingTo(null);
  };

  const toggleSpoilerMask = (id: string) => {
    setUnmaskedSpoilers(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Recursive Comment Node Component for Threading
  interface CommentNodeProps {
    comment: Comment;
    depth?: number;
  }

  const CommentNode: React.FC<CommentNodeProps> = ({ comment, depth = 0 }) => {
    const replies = getReplies(comment.id);
    const isReplying = replyingTo?.id === comment.id;
    const isSpoilerHidden = (comment.spoiler || comment.isSpoiler) && !unmaskedSpoilers[comment.id];
    const canDelete = currentUser?.role === 'admin' || (activeUser && activeUser.uid === comment.userId);

    const displayName = comment.userName || comment.username || 'Pembaca AntiTimpa';
    const isAdmin = comment.userRole === 'admin' || comment.isAdmin;
    const isVip = comment.userRole === 'reader' || comment.isVip;
    const currentUserId = currentUser?.id || googleUser?.uid;
    const isLiked = comment.isLiked || (comment.likedBy && currentUserId ? comment.likedBy.includes(currentUserId) : false);
    const likesCount = comment.likesCount ?? comment.likes ?? 0;

    // Progressive Indentation: indent up to depth 3, with branching connector line
    const indentPadding = depth === 0 ? '' : depth === 1 ? 'ml-4 sm:ml-7 border-l-2 border-[#ff5b14]/30 pl-3 sm:pl-4' : depth === 2 ? 'ml-3 sm:ml-5 border-l-2 border-slate-700/60 pl-2.5 sm:pl-3' : 'ml-2 sm:ml-3 border-l-2 border-slate-800 pl-2';

    return (
      <div className={`space-y-2 mt-2.5 ${indentPadding}`}>
        <div className={`rounded-xl p-3 sm:p-3.5 space-y-2 transition-all ${
          depth === 0 ? 'bg-[#151520] border border-[#262638] shadow-sm' : 'bg-[#111119] border border-[#20202e]'
        }`}>
          {/* Comment Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img
                src={comment.userAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80'}
                alt={displayName}
                className="w-6 h-6 sm:w-7 sm:h-7 rounded-full object-cover border border-[#33334d]"
              />
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-bold text-xs text-slate-100">{displayName}</span>
                {isAdmin && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-0.5">
                    <ShieldCheck className="w-2.5 h-2.5" /> Super Admin
                  </span>
                )}
                {isVip && !isAdmin && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-0.5">
                    <Crown className="w-2.5 h-2.5" /> VIP Member
                  </span>
                )}
                {comment.chapterNumber && (
                  <span className="text-[10px] text-[#ff5b14] font-semibold bg-[#ff5b14]/10 px-1.5 py-0.2 rounded">
                    Ch. {comment.chapterNumber}
                  </span>
                )}
                <span className="text-[10px] text-slate-500">
                  • {comment.createdAt}
                </span>
              </div>
            </div>

            {canDelete && (
              <button
                onClick={() => {
                  if (confirm('Hapus komentar ini beserta balasannya?')) {
                    deleteComment(comment.id);
                  }
                }}
                className="p-1 text-slate-500 hover:text-red-400 rounded transition-colors"
                title="Hapus Komentar"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Comment Content / Spoiler Mask */}
          <div className="text-xs text-slate-300 leading-relaxed pl-8">
            {(comment.spoiler || comment.isSpoiler) && (
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[10px] text-amber-400 font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Mengandung Spoiler
                </span>
                <button
                  onClick={() => toggleSpoilerMask(comment.id)}
                  className="text-[10px] text-slate-400 hover:text-slate-200 flex items-center gap-1 underline"
                >
                  {isSpoilerHidden ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  {isSpoilerHidden ? 'Buka Spoiler' : 'Tutup Spoiler'}
                </button>
              </div>
            )}

            {isSpoilerHidden ? (
              <div 
                onClick={() => toggleSpoilerMask(comment.id)}
                className="cursor-pointer bg-[#0e0e14] border border-amber-500/20 text-slate-500 italic p-2 rounded-lg text-center select-none hover:bg-slate-900 transition-colors"
              >
                (Konten diburamkan karena mengandung bocoran alur/spoiler. Klik di sini untuk membaca)
              </div>
            ) : (
              <p className="whitespace-pre-line text-slate-200">{comment.content}</p>
            )}
          </div>

          {/* Footer Actions: Like & Reply */}
          <div className="flex items-center justify-between pl-8 pt-1 text-xs">
            <button
              onClick={() => setReplyingTo(isReplying ? null : { id: comment.id, username: displayName })}
              className={`flex items-center gap-1 text-[11px] font-semibold transition-colors ${
                isReplying ? 'text-[#ff5b14]' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Reply className="w-3 h-3" />
              <span>{isReplying ? 'Batal Balas' : 'Balas'}</span>
            </button>

            <button
              onClick={() => toggleLikeComment(comment.id)}
              className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-lg transition-colors ${
                isLiked
                  ? 'text-red-400 bg-red-500/10 font-bold'
                  : 'text-slate-400 hover:text-red-400 hover:bg-slate-800'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
              <span>{likesCount}</span>
            </button>
          </div>

          {/* Inline Reply Form */}
          {isReplying && (
            <div className="mt-2.5 pt-2.5 border-t border-[#252538] space-y-2 pl-2">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1 text-[#ff5b14]">
                  <CornerDownRight className="w-3 h-3" />
                  Membalas <strong className="text-white">@{displayName}</strong>
                </span>
                <button onClick={() => setReplyingTo(null)} className="p-0.5 hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              </div>

              <textarea
                rows={2}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={`Tulis balasan untuk @${displayName}...`}
                className="w-full bg-[#0d0d12] border border-[#2c2c40] rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#ff5b14]"
              />

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-400 select-none">
                  <input
                    type="checkbox"
                    checked={replySpoiler}
                    onChange={(e) => setReplySpoiler(e.target.checked)}
                    className="w-3 h-3 rounded border-slate-700 text-[#ff5b14] focus:ring-0"
                  />
                  <span>Spoiler</span>
                </label>

                <button
                  type="button"
                  onClick={() => handleReplySubmit(comment.id)}
                  disabled={!replyText.trim()}
                  className="px-3 py-1.5 bg-[#ff5b14] hover:bg-[#e04e0e] disabled:opacity-50 text-white font-bold text-xs rounded-lg flex items-center gap-1 transition-all"
                >
                  <Send className="w-3 h-3" />
                  <span>Kirim Balasan</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Recursive Child Replies */}
        {replies.length > 0 && (
          <div className="space-y-2">
            {replies.map(reply => (
              <CommentNode key={reply.id} comment={reply} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div id={`comments-${comicId}`} className="bg-[#12121a] rounded-2xl p-4 sm:p-5 border border-[#222232] shadow-xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#202030] pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#ff5b14]/10 text-[#ff5b14] border border-[#ff5b14]/20">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-extrabold text-white text-sm sm:text-base">Kolom Komentar Komik</h4>
            <p className="text-xs text-slate-400">
              Diskusi chapter dan reaksi pembaca ({comicComments.length} Komentar)
            </p>
          </div>
        </div>

        {/* Auth status indicator */}
        {googleUser ? (
          <div className="flex items-center gap-2 bg-[#191924] border border-[#2b2b3d] px-2.5 py-1 rounded-xl text-xs">
            <img
              src={googleUser.photoURL}
              alt={googleUser.displayName}
              className="w-5 h-5 rounded-full ring-1 ring-emerald-500"
            />
            <span className="font-medium text-slate-200 hidden sm:inline">{googleUser.displayName}</span>
            <button
              onClick={logoutGoogle}
              className="text-slate-400 hover:text-red-400 text-[11px] underline"
            >
              Keluar
            </button>
          </div>
        ) : (
          <button
            onClick={() => loginWithGoogle()}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-900 font-bold px-3 py-1.5 rounded-xl text-xs shadow-sm transition-all"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Login Google</span>
          </button>
        )}
      </div>

      {/* Main Comment Input Box */}
      <form onSubmit={handleRootSubmit} className="space-y-2.5">
        <textarea
          rows={3}
          value={newCommentText}
          onChange={(e) => setNewCommentText(e.target.value)}
          placeholder={activeUser 
            ? `Tulis tanggapan atau review untuk "${comicTitle}"...` 
            : `Tulis tanggapanmu (akan diminta login saat mengirim)...`}
          className="w-full bg-[#171724] border border-[#29293e] rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#ff5b14] transition-colors"
        />

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-400 hover:text-slate-300">
            <input
              type="checkbox"
              checked={isSpoiler}
              onChange={(e) => setIsSpoiler(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-slate-700 text-[#ff5b14] focus:ring-0 bg-slate-900"
            />
            <span className="flex items-center gap-1 text-[11px]">
              <AlertCircle className="w-3 h-3 text-amber-400" />
              Mengandung Spoiler / Bocoran
            </span>
          </label>

          <button
            type="submit"
            disabled={!newCommentText.trim()}
            className="px-4 py-2 bg-gradient-to-r from-[#ff5b14] to-[#f97316] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-[#ff5b14]/20 active:scale-95 transition-all"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Kirim Komentar</span>
          </button>
        </div>
      </form>

      {/* Threaded Comment Tree List */}
      <div className="space-y-3 pt-2">
        {rootComments.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs bg-[#151520]/50 rounded-xl border border-dashed border-[#222234]">
            Belum ada komentar untuk komik ini. Jadilah yang pertama memberikan review atau komentar!
          </div>
        ) : (
          rootComments.map((comment) => (
            <CommentNode key={comment.id} comment={comment} depth={0} />
          ))
        )}
      </div>
    </div>
  );
};

