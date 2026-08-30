import { useState, useCallback } from 'react';
import { Comment } from '../types/comment.types';
import { initialComments } from '../../../data/initialData';
import { CommentRepository } from '../services/commentRepository';
import { LocalStorageWrapper } from '../../../services/storage/localStorageWrapper';

const STORAGE_KEY = 'antitimpa_comments_v1';

export function useComments(
  getUserIdentity?: () => { name: string; avatar: string; uid: string; role?: string; email?: string } | null
) {
  const [comments, setComments] = useState<Comment[]>(() =>
    LocalStorageWrapper.getItem<Comment[]>(STORAGE_KEY, initialComments)
  );

  const saveCommentsState = useCallback((newComments: Comment[]) => {
    setComments(newComments);
    LocalStorageWrapper.setItem(STORAGE_KEY, newComments);
  }, []);

  const addComment = useCallback((data: { 
    comicId: string; 
    chapterId?: string; 
    chapterNumber?: number; 
    content: string; 
    spoiler?: boolean; 
    replyToId?: string;
  }): Comment => {
    const ident = getUserIdentity ? getUserIdentity() : null;
    const isUserAdmin = ident?.role === 'admin';
    const isUserVip = ident?.role === 'vip' || ident?.role === 'premium';
    const role = (ident?.role as 'admin' | 'reader' | 'google_user' | 'guest') || 'reader';

    const newComment: Comment = {
      id: `cmt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      comicId: data.comicId,
      chapterId: data.chapterId,
      chapterNumber: data.chapterNumber,
      userId: ident?.uid || `guest-${Date.now()}`,
      userName: ident?.name || 'Pembaca Santai',
      username: ident?.name || 'Pembaca Santai',
      userAvatar: ident?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
      userRole: role,
      userEmail: ident?.email,
      content: data.content,
      likesCount: 0,
      likes: 0,
      spoiler: Boolean(data.spoiler),
      isSpoiler: Boolean(data.spoiler),
      replyToId: data.replyToId,
      isAdmin: isUserAdmin,
      isVip: isUserVip,
      createdAt: new Date().toISOString(),
    };

    const updated = [newComment, ...comments];
    saveCommentsState(updated);
    CommentRepository.save(newComment).catch(console.warn);
    return newComment;
  }, [comments, getUserIdentity, saveCommentsState]);

  const toggleLikeComment = useCallback((commentId: string) => {
    setComments(prev => {
      const updated = prev.map(c => {
        if (c.id === commentId) {
          const count = (c.likesCount || 0) + 1;
          return { ...c, likesCount: count, likes: count };
        }
        return c;
      });
      LocalStorageWrapper.setItem(STORAGE_KEY, updated);
      const target = updated.find(c => c.id === commentId);
      if (target) CommentRepository.save(target).catch(console.warn);
      return updated;
    });
  }, []);

  const deleteComment = useCallback((commentId: string) => {
    const updated = comments.filter(c => c.id !== commentId);
    saveCommentsState(updated);
    CommentRepository.delete(commentId).catch(console.warn);
  }, [comments, saveCommentsState]);

  return {
    comments,
    setComments,
    addComment,
    toggleLikeComment,
    deleteComment,
  };
}
