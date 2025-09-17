import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
// import { Database } from '@/integrations/supabase/types'; // Remove Database import again
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Plus, Upload as LucideUpload, FileText, Image as ImageIcon, XCircle, ChevronDown, Check, Search, MoreHorizontal, Edit, Trash } from 'lucide-react';
import RichTextEditor from '@/components/knowledge-bank/RichTextEditor';
import { IMAGEKIT_PUBLIC_KEY, IMAGEKIT_URL_ENDPOINT, AUTHENTICATION_ENDPOINT } from '@/integrations/imagekit/client';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { upload as imagekitUpload } from '@imagekit/react'; // Corrected import for upload utility
import { Copy } from 'lucide-react'; // Import Copy icon
import { cn } from '../lib/utils'; // Import cn for conditional classnames

// Manually define types to bypass TypeScript caching issues
interface KnowledgeEntry {
  id: string;
  title: string;
  content: any | null;
  search_keywords: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
  category_id: string | null;
  tags: string[] | null;
  attachments?: Attachment[]; // Include attachments as optional
}

interface Attachment {
  id: string;
  knowledge_id: string;
  file_url: string;
  file_name: string;
  mime_type: string | null;
  description: string | null;
  uploaded_by: string;
  created_at: string;
}

interface KnowledgeEntryInsert {
  title: string;
  content?: any | null;
  search_keywords?: string | null;
  category_id?: string | null;
  tags?: string[] | null;
}

interface AttachmentInsert {
  knowledge_id: string;
  file_url: string;
  file_name: string;
  mime_type?: string | null;
  description?: string | null;
  uploaded_by: string;
  created_at?: string; // Make created_at optional
}

interface UploadedFileDisplay extends File {
  imageUrl?: string;
}

// Helper component for highlighting text
interface HighlightTextProps {
  text: string | null | undefined;
  highlight: string;
}

const HighlightText: React.FC<HighlightTextProps> = ({ text, highlight }) => {
  if (!text) return null;
  if (!highlight.trim()) return <>{text}</>;

  const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === highlight.toLowerCase() ? (
          <mark key={i} className="bg-yellow-200 dark:bg-yellow-700 rounded px-0.5">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
};

const KnowledgeBank: React.FC = () => {
  const [knowledgeEntries, setKnowledgeEntries] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isNewEntryDialogOpen, setIsNewEntryDialogOpen] = useState(false);
  const [newEntryTitle, setNewEntryTitle] = useState('');
  const [newEntryContent, setNewEntryContent] = useState('');
  const [newEntryKeywords, setNewEntryKeywords] = useState('');
  const [attachmentsToUpload, setAttachmentsToUpload] = useState<UploadedFileDisplay[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null); // Re-add fileInputRef
  const { toast } = useToast();
  const [selectedEntry, setSelectedEntry] = useState<KnowledgeEntry | null>(null);
  const [isEntryDetailDialogOpen, setIsEntryDetailDialogOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false); // State for copy animation
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<KnowledgeEntry | null>(null);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedContent, setEditedContent] = useState('');
  const [editedKeywords, setEditedKeywords] = useState('');
  const [attachmentsToDisplay, setAttachmentsToDisplay] = useState<Attachment[]>([]); // For existing attachments
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<KnowledgeEntry | null>(null);

  const fetchKnowledgeEntries = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('knowledge_entries')
      .select('*, attachments(*)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching knowledge entries:', error);
      setError(error.message);
    } else {
      setKnowledgeEntries((data as any as KnowledgeEntry[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchKnowledgeEntries();
  }, []);

  const handleCreateNewEntry = () => {
    setNewEntryTitle('');
    setNewEntryContent('');
    setNewEntryKeywords('');
    setAttachmentsToUpload([]);
    setIsNewEntryDialogOpen(true);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setIsUploading(true);
      const files = Array.from(event.target.files);
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        toast({
          title: "Authentication Error",
          description: "Could not get user for file upload. Please log in again.",
          variant: "destructive",
        });
        setIsUploading(false);
        return;
      }

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        toast({
          title: "Authentication Error",
          description: "Could not get active session for file upload. Please log in again.",
          variant: "destructive",
        });
        setIsUploading(false);
        return;
      }

      const uploadedFiles: UploadedFileDisplay[] = [];
      for (const file of files) {
        try {
          const folderPath = `knowledge-bank/${user.id}`;

          // Fetch authentication parameters from our Edge Function
          console.log("KnowledgeBank: Attempting to fetch ImageKit authentication from:", AUTHENTICATION_ENDPOINT);
          const authResponse = await fetch(AUTHENTICATION_ENDPOINT, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
          });

          if (!authResponse.ok) {
            throw new Error(`Failed to get ImageKit authentication: ${authResponse.statusText}`);
          }

          const authData = await authResponse.json();

          if (!authData.token || !authData.expire || !authData.signature) {
            throw new Error("ImageKit authentication response missing required parameters.");
          }

          const response = await imagekitUpload({
            file: file,
            fileName: file.name,
            folder: folderPath,
            useUniqueFileName: true,
            // Pass authentication parameters directly
            token: authData.token,
            expire: authData.expire,
            signature: authData.signature,
            publicKey: IMAGEKIT_PUBLIC_KEY, // Keep publicKey as it's required
            // transformations: [{
            //   width: file.type.startsWith('image') ? 800 : undefined,
            //   format: file.type.startsWith('image') ? 'webp' : undefined,
            // }],
          });

          if (response.url) {
            const fileWithUrl: UploadedFileDisplay = Object.assign(file, { imageUrl: response.url });
            uploadedFiles.push(fileWithUrl);
            toast({
              title: "File uploaded",
              description: `${file.name} uploaded to ImageKit.`,
            });
          }
        } catch (uploadError: any) {
          console.error('Error uploading file to ImageKit:', uploadError);
          toast({
            title: "Upload failed",
            description: `Failed to upload ${file.name}: ${uploadError.message || 'Unknown error'}`,
            variant: "destructive",
          });
        }
      }
      setAttachmentsToUpload(prev => [...prev, ...uploadedFiles]);
      event.target.value = '';
      setIsUploading(false);
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachmentsToUpload(prev => prev.filter((_, i) => i !== index));
  };

  const handleInsertImageIntoEditor = (url: string) => {
    setNewEntryContent(prevContent => prevContent + `<img src="${url}" alt="" />`);
    toast({
      title: "Image Inserted",
      description: "Image URL added to content.",
    });
  };

  const handleInsertPdfIntoEditor = (url: string) => {
    setNewEntryContent(prevContent => prevContent + `<p><a href="${url}" target="_blank" rel="noopener noreferrer">View PDF: ${url.split('/').pop()}</a></p>`);
    toast({
      title: "PDF Link Inserted",
      description: "PDF link added to content.",
    });
  };

  const handleSaveNewEntry = async () => {
    if (!newEntryTitle.trim()) {
      alert('Title cannot be empty.');
      return;
    }

    const newKnowledgeEntry: KnowledgeEntryInsert = {
      title: newEntryTitle,
      content: newEntryContent,
      search_keywords: newEntryKeywords.trim() || null,
    };

    const { data: entryData, error: entryError } = await (supabase as any)
      .from('knowledge_entries')
      .insert([newKnowledgeEntry])
      .select();

    if (entryError) {
      console.error('Error saving new knowledge entry:', entryError);
      setError(entryError.message);
      toast({
        title: "Failed to save entry",
        description: entryError.message,
        variant: "destructive",
      });
      return;
    } else if (entryData && entryData.length > 0) {
      const newKnowledgeId = entryData[0].id;
      const newAttachmentsToSave: AttachmentInsert[] = [];

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast({
          title: "Authentication Error",
          description: "Could not get user for attachment saving. Please log in again.",
          variant: "destructive",
        });
        return;
      }

      for (const file of attachmentsToUpload) {
        if (file.imageUrl) {
          newAttachmentsToSave.push({
            knowledge_id: newKnowledgeId,
            file_url: file.imageUrl,
            file_name: file.name,
            mime_type: file.type,
            description: '',
            uploaded_by: user.id,
          });
        }
      }

      if (newAttachmentsToSave.length > 0) {
        const { error: insertError } = await (supabase as any)
          .from('attachments')
          .insert(newAttachmentsToSave);

        if (insertError) {
          console.error('Error saving attachments to Supabase:', insertError);
          toast({
            title: "Attachment save failed",
            description: `Failed to save attachment metadata: ${insertError.message}`,
            variant: "destructive",
          });
        }
      }

      fetchKnowledgeEntries();
      setIsNewEntryDialogOpen(false);
      toast({
        title: "Knowledge Entry Created",
        description: "Your new knowledge entry and attachments have been saved.",
      });
    }
  };

  const handleEditEntry = (entry: KnowledgeEntry) => {
    setEditingEntry(entry);
    setEditedTitle(entry.title);
    setEditedContent(entry.content || '');
    setEditedKeywords(entry.search_keywords || '');
    setAttachmentsToDisplay(entry.attachments || []);
    setAttachmentsToUpload([]); // Clear new attachments for edit
    setIsEditDialogOpen(true);
  };

  const handleRemoveExistingAttachment = async (attachmentId: string) => {
    const attachmentToRemove = attachmentsToDisplay.find(att => att.id === attachmentId);
    if (attachmentToRemove) {
      const { error: deleteError } = await (supabase as any)
        .from('attachments')
        .delete()
        .eq('id', attachmentId);

      if (deleteError) {
        console.error('Error deleting attachment from Supabase:', deleteError);
        toast({
          title: "Attachment deletion failed",
          description: `Failed to delete attachment: ${deleteError.message}`,
          variant: "destructive",
        });
      } else {
        setAttachmentsToDisplay(prev => prev.filter(att => att.id !== attachmentId));
        toast({
          title: "Attachment Deleted",
          description: `Attachment "${attachmentToRemove.file_name}" deleted.`,
        });
      }
    }
  };

  const handleSaveEditedEntry = async () => {
    if (!editedTitle.trim()) {
      alert('Title cannot be empty.');
      return;
    }

    const updatedKnowledgeEntry: KnowledgeEntryInsert = {
      title: editedTitle,
      content: editedContent,
      search_keywords: editedKeywords.trim() || null,
    };

    const { error: updateError } = await (supabase as any)
      .from('knowledge_entries')
      .update(updatedKnowledgeEntry)
      .eq('id', editingEntry?.id);

    if (updateError) {
      console.error('Error updating knowledge entry:', updateError);
      setError(updateError.message);
      toast({
        title: "Failed to update entry",
        description: updateError.message,
        variant: "destructive",
      });
      return;
    }

    // Handle attachments for update
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      toast({
        title: "Authentication Error",
        description: "Could not get user for attachment saving. Please log in again.",
        variant: "destructive",
      });
      return;
    }

    const attachmentsToSave: AttachmentInsert[] = [];
    for (const file of attachmentsToUpload) {
      if (file.imageUrl) {
        attachmentsToSave.push({
          knowledge_id: editingEntry?.id || '', // Assuming editingEntry.id is available
          file_url: file.imageUrl,
          file_name: file.name,
          mime_type: file.type,
          description: '',
          uploaded_by: user.id,
        });
      }
    }

    if (attachmentsToSave.length > 0) {
      const { error: insertError } = await (supabase as any)
        .from('attachments')
        .insert(attachmentsToSave);

      if (insertError) {
        console.error('Error saving new attachments to Supabase:', insertError);
        toast({
          title: "Attachment save failed",
          description: `Failed to save new attachment metadata: ${insertError.message}`,
          variant: "destructive",
        });
        return;
      }
    }

    // Fetch updated attachments for the single edited entry
    const { data: updatedAttachments, error: fetchAttachmentsError } = await (supabase as any)
      .from('attachments')
      .select('*')
      .eq('knowledge_id', editingEntry?.id);
 
    if (fetchAttachmentsError) {
      console.error('Error fetching updated attachments:', fetchAttachmentsError);
      toast({
        title: "Attachment fetch failed",
        description: `Failed to fetch updated attachments: ${fetchAttachmentsError.message}`,
        variant: "destructive",
      });
      // Proceed without attachments if there's an error
    }
 
    setKnowledgeEntries(prevEntries =>
      prevEntries.map(entry =>
        entry.id === editingEntry?.id
          ? { ...entry, ...updatedKnowledgeEntry, attachments: updatedAttachments || [] } // Update attachments as well
          : entry
      )
    );
 
    setIsEditDialogOpen(false);
    toast({
      title: "Knowledge Entry Updated",
      description: "Your knowledge entry and attachments have been updated.",
    });
  };

  const handleDeleteEntryConfirmation = (entry: KnowledgeEntry) => {
    setEntryToDelete(entry);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteEntry = async () => {
    if (!entryToDelete) return;

    const { error: deleteError } = await (supabase as any)
      .from('knowledge_entries')
      .delete()
      .eq('id', entryToDelete.id);

    if (deleteError) {
      console.error('Error deleting knowledge entry:', deleteError);
      setError(deleteError.message);
      toast({
        title: "Failed to delete entry",
        description: deleteError.message,
        variant: "destructive",
      });
      return;
    }

    // Delete associated attachments
    const { error: deleteAttachmentsError } = await (supabase as any)
      .from('attachments')
      .delete()
      .eq('knowledge_id', entryToDelete.id);

    if (deleteAttachmentsError) {
      console.error('Error deleting attachments for deleted entry:', deleteAttachmentsError);
      toast({
        title: "Failed to delete attachments",
        description: `Failed to delete attachments for entry "${entryToDelete.title}": ${deleteAttachmentsError.message}`,
        variant: "destructive",
      });
    }

    setKnowledgeEntries(prevEntries =>
      prevEntries.filter(entry => entry.id !== entryToDelete.id)
    );
    setIsDeleteDialogOpen(false);
    toast({
      title: "Knowledge Entry Deleted",
      description: `Knowledge entry "${entryToDelete.title}" has been deleted.`,
    });
  };

  const filteredKnowledgeEntries = knowledgeEntries.filter(entry => {
    const query = searchQuery.toLowerCase();
    if (!query) return true; // Show all if no search query

    const matchesTitle = entry.title.toLowerCase().includes(query);
    const matchesContent = entry.content?.toString().toLowerCase().includes(query);
    const matchesKeywords = entry.search_keywords?.toLowerCase().includes(query);

    // Check attachments
    const matchesAttachments = entry.attachments?.some(attachment =>
      attachment.file_name.toLowerCase().includes(query) ||
      (attachment.description && attachment.description.toLowerCase().includes(query))
    );

    return matchesTitle || matchesContent || matchesKeywords || matchesAttachments;
  });

  const handleCopyContent = async () => {
    if (selectedEntry?.content) {
      try {
        await navigator.clipboard.writeText(selectedEntry.content as string);
        setIsCopied(true);
        toast({
          title: "Content Copied!",
          description: "Entry content copied to clipboard.",
        });
        setTimeout(() => setIsCopied(false), 2000); // Reset animation state after 2 seconds
      } catch (err) {
        console.error('Failed to copy:', err);
        toast({
          title: "Copy Failed",
          description: "Unable to copy content to clipboard.",
          variant: "destructive",
        });
      }
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 text-center">
        <p>Loading knowledge entries...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 text-center text-red-500">
        <p>Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Knowledge Bank</h1>
        <div className="flex items-center gap-2">
          <Button onClick={() => window.location.href = '/'} variant="outline">
            Home
          </Button>
          <Button onClick={handleCreateNewEntry}>
            <Plus className="mr-2 h-4 w-4" /> New Entry
          </Button>
        </div>
      </div>
      
      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search knowledge entries by title, content, or keywords..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 w-full"
        />
      </div>

      {filteredKnowledgeEntries.length === 0 ? (
        <p>No knowledge entries found. Create your first one!</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filteredKnowledgeEntries.map((entry) => (
            <div 
              key={entry.id} 
              className="p-4 border bg-card text-card-foreground rounded-lg shadow-sm cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors"
              onClick={() => {
                setSelectedEntry(entry);
                setIsEntryDetailDialogOpen(true);
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg sm:text-xl font-semibold text-primary"><HighlightText text={entry.title} highlight={searchQuery} /></h2>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation(); // Prevent opening detail dialog
                      handleEditEntry(entry);
                    }}>
                      <Edit className="mr-2 h-4 w-4" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation(); // Prevent opening detail dialog
                      handleDeleteEntryConfirmation(entry);
                    }} className="text-destructive">
                      <Trash className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <p className="text-sm text-gray-600">Created: {new Date(entry.created_at).toLocaleDateString()}</p>
              {entry.content && (
                <div className="prose dark:prose-invert mt-2 text-sm line-clamp-3">
                  {/* Render HTML content directly */} 
                  <div dangerouslySetInnerHTML={{ __html: entry.content as string }} />
                  {/* <HighlightText text={entry.content as string} highlight={searchQuery} /> */}
                </div>
              )}
              {entry.search_keywords && (
                <p className="text-xs text-secondary-foreground mt-1">
                  Keywords: <HighlightText text={entry.search_keywords} highlight={searchQuery} />
                </p>
              )}
              {entry.attachments && entry.attachments.length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-sm font-semibold">Attachments:</p>
                  {entry.attachments.map((attachment) => (
                    <div key={attachment.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                      {attachment.mime_type?.startsWith('image') ? (
                        <ImageIcon className="h-3 w-3" />
                      ) : (
                        <FileText className="h-3 w-3" />
                      )}
                      <a href={attachment.file_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        <HighlightText text={attachment.file_name} highlight={searchQuery} />
                      </a>
                      {attachment.description && (
                        <span className="ml-1 italic">- <HighlightText text={attachment.description} highlight={searchQuery} /></span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* New Entry Dialog */}
      <Dialog open={isNewEntryDialogOpen} onOpenChange={setIsNewEntryDialogOpen} >
        <DialogContent className="sm:max-w-[800px] w-full max-h-[90vh] overflow-y-auto grid gap-4 py-4 grid-cols-4">
          <DialogHeader className="col-span-4">
            <DialogTitle>Create New Knowledge Entry</DialogTitle>
            <DialogDescription>Add a title, content, and attachments for your new knowledge entry.</DialogDescription>
          </DialogHeader>
            <Label htmlFor="title" className="col-span-1 text-right">
                Title
              </Label>
              <Input
                id="title"
                value={newEntryTitle}
                onChange={(e) => setNewEntryTitle(e.target.value)}
                className="col-span-3"
              />
            <Label htmlFor="content" className="col-span-1 text-right mt-2">
                Content
              </Label>
              <div className="col-span-3">
                <RichTextEditor 
                  content={newEntryContent} 
                  onUpdate={setNewEntryContent} 
                  onInsertImage={handleInsertImageIntoEditor}
                  onInsertPdf={handleInsertPdfIntoEditor}
                />
              </div>
            <Label htmlFor="keywords" className="col-span-1 text-right">
                Search Keywords
              </Label>
              <Input
                id="keywords"
                value={newEntryKeywords}
                onChange={(e) => setNewEntryKeywords(e.target.value)}
                placeholder="Comma-separated keywords for search..."
                className="col-span-3"
              />
            {/* File Upload Section */}
            <Label htmlFor="attachments" className="col-span-1 text-right mt-2">
                Attachments
              </Label>
              <div className="col-span-3 space-y-2">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  className="hidden"
                  multiple
                  accept="image/*,application/pdf"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full" 
                  disabled={isUploading}
                >
                  <LucideUpload className="mr-2 h-4 w-4" /> {isUploading ? 'Uploading...' : 'Select Files'}
                </Button>
              
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {attachmentsToUpload.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No files selected.</p>
                  ) : (
                    attachmentsToUpload.map((file, index) => ( 
                      <div key={file.name + index} className="flex items-center justify-between p-2 border rounded-md text-sm">
                        <div className="flex items-center gap-2">
                          {file.type.startsWith('image') ? (
                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <FileText className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span>{file.name}</span>
                          {file.imageUrl && <Check className="h-4 w-4 text-green-500" />}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {file.imageUrl && file.type.startsWith('image') && (
                              <DropdownMenuItem onClick={() => handleInsertImageIntoEditor(file.imageUrl!)}>
                                Insert Image to Editor
                              </DropdownMenuItem>
                            )}
                            {file.imageUrl && file.type === 'application/pdf' && (
                              <DropdownMenuItem onClick={() => handleInsertPdfIntoEditor(file.imageUrl!)}>
                                Insert PDF Link to Editor
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleRemoveAttachment(index)} className="text-destructive">
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))
                  )}
                </div>
              </div>
          <DialogFooter className="col-span-4">
            <Button type="submit" onClick={handleSaveNewEntry} disabled={isUploading}>Save Entry</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Entry Detail Dialog */}
      <Dialog open={isEntryDetailDialogOpen} onOpenChange={setIsEntryDetailDialogOpen} >
        <DialogContent className="sm:max-w-[800px] w-full max-h-[90vh] overflow-y-auto ">
          {selectedEntry?.content && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleCopyContent} 
              className={cn(
                "flex-shrink-0 absolute top-4 right-12", // Adjusted right position
                isCopied && "animate-wiggle"
              )}
            >
              <Copy className="h-4 w-4" />
            </Button>
          )}
          <DialogHeader>
            <DialogTitle>{selectedEntry?.title}</DialogTitle>
            <DialogDescription>
              Created: {selectedEntry?.created_at ? new Date(selectedEntry.created_at).toLocaleDateString() : 'N/A'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedEntry?.content && (
              <div className="prose dark:prose-invert mb-4" dangerouslySetInnerHTML={{ __html: selectedEntry.content as string }} />
            )}
            {selectedEntry?.search_keywords && (
              <p className="text-sm text-muted-foreground mb-4">
                Keywords: {selectedEntry.search_keywords}
              </p>
            )}
            {selectedEntry?.attachments && selectedEntry.attachments.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-semibold">Attachments:</p>
                {selectedEntry.attachments.map((attachment) => (
                  <div key={attachment.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                    {attachment.mime_type?.startsWith('image') ? (
                      <ImageIcon className="h-4 w-4" />
                    ) : (
                      <FileText className="h-4 w-4" />
                    )}
                    <a href={attachment.file_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      {attachment.file_name}
                    </a>
                    {attachment.description && (
                      <span className="ml-1 italic">- {attachment.description}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsEntryDetailDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Entry Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} >
        <DialogContent className="sm:max-w-[800px] w-full max-h-[90vh] overflow-y-auto grid gap-4 py-4 grid-cols-4">
          <DialogHeader className="col-span-4">
            <DialogTitle>Edit Knowledge Entry</DialogTitle>
            <DialogDescription>Modify the title, content, or attachments for this knowledge entry.</DialogDescription>
          </DialogHeader>
            <Label htmlFor="edit-title" className="col-span-1 text-right">
                Title
              </Label>
              <Input
                id="edit-title"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="col-span-3"
              />
            <Label htmlFor="edit-content" className="col-span-1 text-right mt-2">
                Content
              </Label>
              <div className="col-span-3">
                <RichTextEditor
                  content={editedContent}
                  onUpdate={setEditedContent}
                  onInsertImage={handleInsertImageIntoEditor}
                  onInsertPdf={handleInsertPdfIntoEditor}
                />
              </div>
            <Label htmlFor="edit-keywords" className="col-span-1 text-right">
                Search Keywords
              </Label>
              <Input
                id="edit-keywords"
                value={editedKeywords}
                onChange={(e) => setEditedKeywords(e.target.value)}
                placeholder="Comma-separated keywords for search..."
                className="col-span-3"
              />
            {/* Existing Attachments Display */}
            <Label htmlFor="existing-attachments" className="col-span-1 text-right mt-2">
                Existing Attachments
              </Label>
              <div className="col-span-3 space-y-2 max-h-40 overflow-y-auto">
                {attachmentsToDisplay.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No existing attachments.</p>
                ) : (
                  attachmentsToDisplay.map((attachment, index) => (
                    <div key={attachment.id} className="flex items-center justify-between p-2 border rounded-md text-sm">
                      <div className="flex items-center gap-2">
                        {attachment.mime_type?.startsWith('image') ? (
                          <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span>{attachment.file_name}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => handleRemoveExistingAttachment(attachment.id)}
                      >
                        <XCircle className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            {/* File Upload Section for Edit */}
            <Label htmlFor="edit-attachments" className="col-span-1 text-right mt-2">
                New Attachments
              </Label>
              <div className="col-span-3 space-y-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  multiple
                  accept="image/*,application/pdf"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                  disabled={isUploading}
                >
                  <LucideUpload className="mr-2 h-4 w-4" /> {isUploading ? 'Uploading...' : 'Select Files'}
                </Button>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {attachmentsToUpload.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No new files selected.</p>
                  ) : (
                    attachmentsToUpload.map((file, index) => (
                      <div key={file.name + index} className="flex items-center justify-between p-2 border rounded-md text-sm">
                        <div className="flex items-center gap-2">
                          {file.type.startsWith('image') ? (
                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <FileText className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span>{file.name}</span>
                          {file.imageUrl && <Check className="h-4 w-4 text-green-500" />}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {file.imageUrl && file.type.startsWith('image') && (
                              <DropdownMenuItem onClick={() => handleInsertImageIntoEditor(file.imageUrl!)}>
                                Insert Image to Editor
                              </DropdownMenuItem>
                            )}
                            {file.imageUrl && file.type === 'application/pdf' && (
                              <DropdownMenuItem onClick={() => handleInsertPdfIntoEditor(file.imageUrl!)}>
                                Insert PDF Link to Editor
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleRemoveAttachment(index)} className="text-destructive">
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))
                  )}
                </div>
              </div>
          <DialogFooter className="col-span-4">
            <Button type="submit" onClick={handleSaveEditedEntry} disabled={isUploading}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="w-full sm:max-w-[425px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your knowledge entry
              "<strong>{entryToDelete?.title}</strong>" and remove its associated data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEntry} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default KnowledgeBank;
