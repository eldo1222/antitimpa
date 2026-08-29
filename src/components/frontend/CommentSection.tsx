import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { MessageSquare, Heart, Trash2, CornerDownRight, Send, AlertCircle } from 'lucide-react';

interface CommentSectionProps {
  comicId: string;
  comicTitle?: string;
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
    addComment, 
    toggleLikeComment, 
    deleteComment, 
    currentUser, 
    googleUser, 
    openLoginModal 
  } = useApp();

  const [commentText, setCommentText] = useState('');
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  // Filter comments for this comic
  const comicComments = comments.filter(c => c.comicId === comicId);
  const rootComments = comicComments.filter(c => !c.replyToId);
  const getReplies = (parentId: string) => comicComments.filter(c => c.replyToId === parentId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    if (!currentUser && !googleUser) {
      openLoginModal();
      return;
    }

    addComment({
      comicId,
      chapterId,
      chapterNumber,
      content: commentText.trim(),
      spoiler: isSpoiler
    });

    setCommentText('');
    setIsSpoiler(false);
  };

  const handleReplySubmit = (parentId: string) => {
    if (!replyText.trim()) return;

    if (!currentUser && !googleUser) {
      openLoginModal();
      return;
    }

    addComment({
      comicId,
      chapterId,
      chapterNumber,
      content: replyText.trim(),
      replyToId: parentId
    });

    setReplyText('');
    setReplyingToId(null);
  };

  const currentUserName = googleUser?.displayName || currentUser?.username || 'Tamu';
  const currentUserAvatar = googleUser?.photoURL || (currentUser?.role === 'admin' 
    ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80' 
    : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-3 border-b border-[#1f1f2e]">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-[#ff5b14]" />
          <h3 className="font-black text-base sm:text-lg text-white">Diskusi & Komentar</h3>
          <span className="text-xs font-bold text-slate-400 bg-[#1c1c28] px-2 py-0.5 rounded-md border border-[#2a2a3c]">
            {comicComments.length}
          </span>
        </div>
        {comicTitle && (
          <span className="text-xs text-slate-400 truncate max-w-[200px] hidden sm:inline">
            {comicTitle}
          </span>
        )}
      </div>

      {/* Comment Input Box */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-3">
          <img 
            src={currentUserAvatar} 
            alt={currentUserName} 
            referrerPolicy="no-referrer"
            className="w-10 h-10 rounded-full object-cover border border-[#2a2a3c] shrink-0" 
          />
          <div className="flex-1 space-y-2">
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={
                currentUser || googleUser
                  ? `Tulis komentar Anda sebagai @${currentUserName}...`
                  : 'Masuk atau hubungkan akun untuk berkomentar...'
              }
              rows={3}
              className="w-full px-4 py-3 bg-[#171722] border border-[#28283c] rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#ff5b14] transition-colors resize-none"
            />
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isSpoiler}
                  onChange={(e) => setIsSpoiler(e.target.checked)}
                  className="rounded border-[#28283c] text-[#ff5b14] focus:ring-0 bg-[#171722]"
                />
                <span className="flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                  Tandai sebagai Spoiler
                </span>
              </label>

              <button
                type="submit"
                disabled={!commentText.trim()}
                className="px-5 py-2 bg-gradient-to-r from-[#ff5b14] to-[#f97316] hover:opacity-95 disabled:opacity-40 text-white font-extrabold text-xs rounded-xl shadow-lg flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer disabled:cursor-not-allowed"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Kirim Komentar</span>
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Comments List */}
      <div className="space-y-4 pt-2">
        {rootComments.length === 0 ? (
          <div className="text-center py-8 bg-[#161622] rounded-xl border border-[#242436] space-y-2">
            <MessageSquare className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-xs font-semibold text-slate-400">Belum ada komentar untuk komik ini.</p>
            <p className="text-[11px] text-slate-500">Jadilah yang pertama memberikan ulasan dan berdiskusi!</p>
          </div>
        ) : (
          rootComments.map((comment) => {
            const replies = getReplies(comment.id);
            const canDelete = currentUser?.role === 'admin' || (currentUser && currentUser.id === comment.userId) || (googleUser && googleUser.uid === comment.userId);

            return (
              <div key={comment.id} className="p-4 bg-[#161622] rounded-xl border border-[#242436] space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img 
                      src={comment.userAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80'} 
                      alt={comment.userName || comment.username || 'User'} 
                      referrerPolicy="no-referrer"
                      className="w-9 h-9 rounded-full object-cover border border-[#2f2f45]" 
                    />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs sm:text-sm text-white">
                          {comment.userName || comment.username || 'Pembaca'}
                        </span>
                        {comment.isAdmin && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-red-500/20 text-red-400 border border-red-500/30">
                            ADMIN
                          </span>
                        )}
                        {comment.isVip && !comment.isAdmin && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            VIP MEMBER
                          </span>
                        )}
                        {comment.chapterNumber && (
                          <span className="text-[10px] text-slate-400 bg-[#1f1f2e] px-1.5 py-0.2 rounded border border-[#2d2d42]">
                            Ch. {comment.chapterNumber}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500">{comment.createdAt || 'Baru saja'}</span>
                    </div>
                  </div>

                  {canDelete && (
                    <button
                      onClick={() => deleteComment(comment.id)}
                      className="text-slate-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                      title="Hapus komentar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="text-xs sm:text-sm text-slate-200 leading-relaxed pl-12">
                  {comment.spoiler ? (
                    <details className="cursor-pointer group">
                      <summary className="text-amber-400 text-xs font-semibold select-none flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Komentar ini mengandung spoiler (klik untuk melihat)
                      </summary>
                      <p className="mt-2 text-slate-300 p-2.5 bg-black/40 rounded-lg border border-amber-500/20">{comment.content}</p>
                    </details>
                  ) : (
                    <p className="whitespace-pre-line">{comment.content}</p>
                  )}
                </div>

                {/* Comment Actions */}
                <div className="flex items-center gap-4 pl-12 pt-1 border-t border-[#1f1f2e]/60">
                  <button
                    onClick={() => toggleLikeComment(comment.id)}
                    className={`flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                      comment.isLiked ? 'text-rose-500' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${comment.isLiked ? 'fill-rose-500' : ''}`} />
                    <span>{comment.likes || 0}</span>
                  </button>

                  <button
                    onClick={() => setReplyingToId(replyingToId === comment.id ? null : comment.id)}
                    className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <CornerDownRight className="w-3.5 h-3.5 text-[#ff5b14]" />
                    <span>Balas</span>
                  </button>
                </div>

                {/* Reply Form */}
                {replyingToId === comment.id && (
                  <div className="pl-12 pt-2 space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder={`Balas @${comment.userName || comment.username}...`}
                        className="flex-1 px-3 py-2 bg-[#1b1b28] border border-[#2b2b3e] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#ff5b14]"
                      />
                      <button
                        onClick={() => handleReplySubmit(comment.id)}
                        disabled={!replyText.trim()}
                        className="px-3.5 py-2 bg-[#ff5b14] hover:bg-[#e04f10] disabled:opacity-40 text-white font-bold text-xs rounded-xl flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <Send className="w-3 h-3" />
                        <span>Kirim</span>
                      </button>
                      <button
                        onClick={() => {
                          setReplyingToId(null);
                          setReplyText('');
                        }}
                        className="px-3 py-2 bg-[#232334] hover:bg-[#2c2c40] text-slate-400 text-xs rounded-xl transition-all"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                )}

                {/* Replies Thread */}
                {replies.length > 0 && (
                  <div className="pl-8 space-y-2 pt-2 border-l-2 border-[#252538] ml-4">
                    {replies.map((reply) => {
                      const canDeleteReply = currentUser?.role === 'admin' || (currentUser && currentUser.id === reply.userId) || (googleUser && googleUser.uid === reply.userId);

                      return (
                        <div key={reply.id} className="p-3 bg-[#191926] rounded-xl border border-[#28283c] space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <img 
                                src={reply.userAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80'} 
                                alt={reply.userName || reply.username || 'User'} 
                                referrerPolicy="no-referrer"
                                className="w-6 h-6 rounded-full object-cover border border-[#2f2f45]" 
                              />
                              <span className="font-bold text-xs text-white">
                                {reply.userName || reply.username}
                              </span>
                              {reply.isAdmin && (
                                <span className="px-1 py-0.2 rounded text-[8px] font-black bg-red-500/20 text-red-400 border border-red-500/30">
                                  ADMIN
                                </span>
                              )}
                              <span className="text-[9px] text-slate-500">{reply.createdAt || 'Baru saja'}</span>
                            </div>

                            {canDeleteReply && (
                              <button
                                onClick={() => deleteComment(reply.id)}
                                className="text-slate-500 hover:text-red-400 p-1 rounded transition-colors"
                                title="Hapus balasan"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                          <p className="text-xs text-slate-300 leading-relaxed pl-8">
                            {reply.content}
                          </p>

                          <div className="flex items-center gap-2 pl-8">
                            <button
                              onClick={() => toggleLikeComment(reply.id)}
                              className={`flex items-center gap-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                                reply.isLiked ? 'text-rose-500' : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              <Heart className={`w-3 h-3 ${reply.isLiked ? 'fill-rose-500' : ''}`} />
                              <span>{reply.likes || 0}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
