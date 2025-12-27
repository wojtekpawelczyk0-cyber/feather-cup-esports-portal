import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface StaticPage {
  id: string;
  slug: string;
  title: string;
  content: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export const useStaticPages = () => {
  return useQuery({
    queryKey: ['static-pages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('static_pages')
        .select('*')
        .order('title');
      
      if (error) throw error;
      return data as StaticPage[];
    }
  });
};

export const useStaticPage = (slug: string) => {
  return useQuery({
    queryKey: ['static-page', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('static_pages')
        .select('*')
        .eq('slug', slug)
        .single();
      
      if (error) throw error;
      return data as StaticPage;
    },
    enabled: !!slug
  });
};

export const useUpdateStaticPage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, title, content, is_published }: { 
      id: string; 
      title: string; 
      content: string; 
      is_published: boolean 
    }) => {
      const { error } = await supabase
        .from('static_pages')
        .update({ title, content, is_published })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['static-pages'] });
      queryClient.invalidateQueries({ queryKey: ['static-page'] });
      toast.success('Strona została zaktualizowana');
    },
    onError: () => {
      toast.error('Błąd podczas aktualizacji strony');
    }
  });
};
