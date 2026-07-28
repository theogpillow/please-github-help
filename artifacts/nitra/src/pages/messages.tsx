import { useState, useEffect, useRef } from 'react';
import { useSearch } from 'wouter';
import { Send, Plus, MessageSquare, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UserAvatar } from '@/components/user-avatar';
import { useListConversations, useListMessages, useSendMessage, useCreateConversation, useListUsers, useGetUser, getListConversationsQueryKey, getListMessagesQueryKey, getListUsersQueryKey, getGetUserQueryKey } from '@workspace/api-client-react';
import { getCurrentUser } from '@/lib/auth';
import { formatRelativeTime } from '@/lib/format';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import type { Conversation } from '@workspace/api-client-react';

export default function Messages() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const currentUser = getCurrentUser();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const search = useSearch();
  const withUsername = new URLSearchParams(search).get('with');

  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messageText, setMessageText] = useState('');
  const [isNewConvoOpen, setIsNewConvoOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [autoStarted, setAutoStarted] = useState(false);

  const { data: conversations, isLoading: conversationsLoading } = useListConversations(
    currentUser ? { userId: currentUser.id } : undefined as any
  );

  // Look up the user from the ?with= param
  const { data: withUser } = useGetUser(
    withUsername ?? '',
    { query: { enabled: !!withUsername, queryKey: getGetUserQueryKey(withUsername ?? '') } }
  );
  const { data: messages, isLoading: messagesLoading } = useListMessages(
    selectedConversation?.id || 0,
    { query: { enabled: !!selectedConversation, queryKey: getListMessagesQueryKey(selectedConversation?.id || 0) } }
  );
  const { data: searchResults, isFetching: searchFetching } = useListUsers(
    searchTerm.trim() ? { q: searchTerm.trim() } : undefined,
    { query: { enabled: !!searchTerm.trim(), queryKey: getListUsersQueryKey(searchTerm.trim() ? { q: searchTerm.trim() } : undefined) } }
  );

  const sendMessage = useSendMessage();
  const createConversation = useCreateConversation();

  // Auto-open or create conversation when arriving via ?with=username
  useEffect(() => {
    if (!withUser || !currentUser || !conversations || autoStarted) return;
    if (withUser.id === currentUser.id) return; // can't chat yourself

    setAutoStarted(true);

    // Check if a conversation with this user already exists
    const existing = conversations.find(
      c => c.initiatorId === withUser.id || c.recipientId === withUser.id
    );
    if (existing) {
      setSelectedConversation(existing);
      return;
    }

    // Create a new conversation
    createConversation.mutate(
      { data: { initiatorId: currentUser.id, recipientId: withUser.id } },
      {
        onSuccess: (newConvo) => {
          queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey({ userId: currentUser.id }) });
          setSelectedConversation(newConvo);
        },
        onError: () => {
          toast({ title: 'Could not start conversation', variant: 'destructive' });
        },
      }
    );
  }, [withUser, currentUser, conversations, autoStarted]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!currentUser || !selectedConversation || !messageText.trim()) return;

    sendMessage.mutate(
      {
        id: selectedConversation.id,
        data: {
          senderId: currentUser.id,
          content: messageText.trim(),
        },
      },
      {
        onSuccess: () => {
          setMessageText('');
          queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey(selectedConversation.id) });
          queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey({ userId: currentUser.id }) });
        },
        onError: () => {
          toast({
            title: 'Failed to send message',
            description: 'Please try again.',
            variant: 'destructive',
          });
        },
      }
    );
  };

  const handleCreateConversation = () => {
    if (!currentUser || !selectedUserId) return;

    createConversation.mutate(
      {
        data: {
          initiatorId: currentUser.id,
          recipientId: selectedUserId,
        },
      },
      {
        onSuccess: (newConvo) => {
          toast({
            title: 'Conversation started',
            description: 'You can now send messages.',
          });
          queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey({ userId: currentUser.id }) });
          setIsNewConvoOpen(false);
          setSelectedConversation(newConvo);
          setSelectedUserId(null);
          setSearchTerm('');
        },
        onError: () => {
          toast({
            title: 'Failed to start conversation',
            description: 'Please try again.',
            variant: 'destructive',
          });
        },
      }
    );
  };

  if (!currentUser) {
    return (
      <div className="min-h-[100dvh] pt-20 pb-24 flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground" />
            <h3 className="text-xl font-semibold">Sign in to message</h3>
          </CardContent>
        </Card>
      </div>
    );
  }

  const otherUsername = (convo: Conversation) => {
    return convo.initiatorId === currentUser.id
      ? convo.recipientUsername
      : convo.initiatorUsername;
  };

  return (
    <div className="min-h-[100dvh] pt-20 pb-24 md:pb-8 px-4 md:px-6 animate-fade-in">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row gap-4 h-[calc(100dvh-12rem)]">
          {/* Conversations List */}
          <Card className="w-full md:w-80 flex flex-col">
            <CardHeader className="flex-shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle>Messages</CardTitle>
                <Dialog open={isNewConvoOpen} onOpenChange={setIsNewConvoOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-new-conversation" size="icon" variant="outline">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>New Conversation</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      {/* Search bar */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                          data-testid="input-user-search"
                          placeholder="Search by username..."
                          value={searchTerm}
                          onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setSelectedUserId(null);
                          }}
                          className="pl-9"
                          autoFocus
                        />
                      </div>

                      {/* Results */}
                      {searchTerm.trim() && (
                        <div className="min-h-[3rem]">
                          {searchFetching ? (
                            <Skeleton className="h-14 w-full" />
                          ) : searchResults && searchResults.filter((u) => u.id !== currentUser.id).length > 0 ? (
                            <div className="space-y-2">
                              {searchResults
                                .filter((u) => u.id !== currentUser.id)
                                .map((user) => (
                                  <button
                                    key={user.id}
                                    data-testid={`button-user-${user.username}`}
                                    onClick={() => setSelectedUserId(user.id)}
                                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                                      selectedUserId === user.id
                                        ? 'bg-primary text-primary-foreground border-primary'
                                        : 'hover:bg-muted border-transparent'
                                    }`}
                                  >
                                    <UserAvatar username={user.username} className="h-8 w-8" />
                                    <div className="text-left">
                                      <p className="font-medium">{user.username}</p>
                                      {user.companyName && (
                                        <p className={`text-xs ${selectedUserId === user.id ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                                          {user.companyName}
                                        </p>
                                      )}
                                    </div>
                                  </button>
                                ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground text-center py-3">
                              Username does not exist
                            </p>
                          )}
                        </div>
                      )}

                      <Button
                        data-testid="button-start-conversation"
                        onClick={handleCreateConversation}
                        disabled={!selectedUserId || createConversation.isPending}
                        className="w-full"
                      >
                        {createConversation.isPending ? 'Starting...' : 'Start Conversation'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <ScrollArea className="flex-1">
              {conversationsLoading ? (
                <div className="p-4 space-y-2">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : conversations && conversations.length > 0 ? (
                <div className="p-2 space-y-1">
                  {conversations.map((convo) => (
                    <button
                      key={convo.id}
                      data-testid={`button-conversation-${convo.id}`}
                      onClick={() => setSelectedConversation(convo)}
                      className={`w-full flex items-start gap-3 p-3 rounded-lg transition-colors ${
                        selectedConversation?.id === convo.id
                          ? 'bg-accent'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <UserAvatar username={otherUsername(convo) || 'U'} className="h-10 w-10 shrink-0" />
                      <div className="flex-1 text-left min-w-0">
                        <p className="font-medium truncate">{otherUsername(convo)}</p>
                        {convo.lastMessage && (
                          <p className="text-sm text-muted-foreground truncate">
                            {convo.lastMessage}
                          </p>
                        )}
                        {convo.lastMessageAt && (
                          <p className="text-xs text-muted-foreground">
                            {formatRelativeTime(convo.lastMessageAt)}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No conversations yet
                </div>
              )}
            </ScrollArea>
          </Card>

          {/* Messages View */}
          <Card className="flex-1 flex flex-col">
            {selectedConversation ? (
              <>
                <CardHeader className="flex-shrink-0 border-b">
                  <CardTitle className="flex items-center gap-3">
                    <UserAvatar username={otherUsername(selectedConversation) || 'U'} className="h-8 w-8" />
                    {otherUsername(selectedConversation)}
                  </CardTitle>
                </CardHeader>
                <ScrollArea className="flex-1 p-4">
                  {messagesLoading ? (
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-16" />
                      ))}
                    </div>
                  ) : messages && messages.length > 0 ? (
                    <div className="space-y-4">
                      {messages.map((msg) => {
                        const isOwn = msg.senderId === currentUser.id;
                        return (
                          <div
                            key={msg.id}
                            data-testid={`message-${msg.id}`}
                            className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[70%] rounded-lg p-3 ${
                                isOwn
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted'
                              }`}
                            >
                              <p className="text-sm break-words">{msg.content}</p>
                              <p className={`text-xs mt-1 ${isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                                {formatRelativeTime(msg.createdAt)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  ) : (
                    <div className="text-center text-sm text-muted-foreground py-8">
                      No messages yet. Start the conversation!
                    </div>
                  )}
                </ScrollArea>
                <div className="flex-shrink-0 p-4 border-t">
                  <div className="flex gap-2">
                    <Input
                      data-testid="input-message"
                      type="text"
                      placeholder="Type a message..."
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      className="flex-1"
                    />
                    <Button
                      data-testid="button-send-message"
                      onClick={handleSendMessage}
                      disabled={!messageText.trim() || sendMessage.isPending}
                      size="icon"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center space-y-2">
                  <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/50" />
                  <p className="text-muted-foreground">Select a conversation to start messaging</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
