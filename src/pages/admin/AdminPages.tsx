import { useState } from 'react';
import { Loader2, Save, Eye, EyeOff, FileText, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useStaticPages, useUpdateStaticPage } from '@/hooks/useStaticPages';
import { Link } from 'react-router-dom';

const AdminPages = () => {
  const { data: pages, isLoading } = useStaticPages();
  const updatePage = useUpdateStaticPage();
  const [editedPages, setEditedPages] = useState<Record<string, {
    title: string;
    content: string;
    is_published: boolean;
  }>>({});

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const getEditedPage = (page: NonNullable<typeof pages>[0]) => {
    return editedPages[page.id] || {
      title: page.title,
      content: page.content || '',
      is_published: page.is_published
    };
  };

  const handleChange = (pageId: string, field: string, value: string | boolean) => {
    const page = pages?.find(p => p.id === pageId);
    if (!page) return;

    setEditedPages(prev => ({
      ...prev,
      [pageId]: {
        ...getEditedPage(page),
        [field]: value
      }
    }));
  };

  const handleSave = async (pageId: string) => {
    const page = pages?.find(p => p.id === pageId);
    if (!page) return;

    const edited = getEditedPage(page);
    await updatePage.mutateAsync({
      id: pageId,
      title: edited.title,
      content: edited.content,
      is_published: edited.is_published
    });

    // Clear edited state for this page
    setEditedPages(prev => {
      const newState = { ...prev };
      delete newState[pageId];
      return newState;
    });
  };

  const hasChanges = (page: NonNullable<typeof pages>[0]) => {
    const edited = editedPages[page.id];
    if (!edited) return false;
    return edited.title !== page.title || 
           edited.content !== (page.content || '') || 
           edited.is_published !== page.is_published;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Zarządzanie stronami</h1>
          <p className="text-muted-foreground mt-1">Edytuj treści stron statycznych</p>
        </div>
      </div>

      <Tabs defaultValue={pages?.[0]?.slug} className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          {pages?.map(page => (
            <TabsTrigger key={page.id} value={page.slug} className="gap-2">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">{page.title.replace('FAQ - Często zadawane pytania', 'FAQ')}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {pages?.map(page => {
          const edited = getEditedPage(page);
          
          return (
            <TabsContent key={page.id} value={page.slug}>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    {page.title}
                  </CardTitle>
                  <div className="flex items-center gap-4">
                    <Link 
                      to={`/${page.slug}`} 
                      target="_blank"
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      <ExternalLink className="w-5 h-5" />
                    </Link>
                    <div className="flex items-center gap-2">
                      {edited.is_published ? (
                        <Eye className="w-4 h-4 text-green-500" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-muted-foreground" />
                      )}
                      <Label htmlFor={`published-${page.id}`} className="text-sm">
                        {edited.is_published ? 'Opublikowana' : 'Ukryta'}
                      </Label>
                      <Switch
                        id={`published-${page.id}`}
                        checked={edited.is_published}
                        onCheckedChange={(checked) => handleChange(page.id, 'is_published', checked)}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor={`title-${page.id}`}>Tytuł strony</Label>
                    <Input
                      id={`title-${page.id}`}
                      value={edited.title}
                      onChange={(e) => handleChange(page.id, 'title', e.target.value)}
                      placeholder="Tytuł strony"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`content-${page.id}`}>Treść (Markdown)</Label>
                    <Textarea
                      id={`content-${page.id}`}
                      value={edited.content}
                      onChange={(e) => handleChange(page.id, 'content', e.target.value)}
                      placeholder="Treść strony w formacie Markdown..."
                      className="min-h-[400px] font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Używaj formatowania Markdown: # nagłówek, ## podtytuł, - lista, **pogrubienie**
                    </p>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={() => handleSave(page.id)}
                      disabled={!hasChanges(page) || updatePage.isPending}
                    >
                      {updatePage.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Zapisz zmiany
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
};

export default AdminPages;
