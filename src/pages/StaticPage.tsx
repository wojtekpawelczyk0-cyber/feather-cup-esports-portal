import { useParams, Navigate } from 'react-router-dom';
import { Loader2, FileText, Shield, HelpCircle, HeadphonesIcon } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { HeroSection } from '@/components/shared/HeroSection';
import { useStaticPage } from '@/hooks/useStaticPages';

const iconMap: Record<string, React.ReactNode> = {
  'regulamin': <FileText className="w-12 h-12" />,
  'polityka-prywatnosci': <Shield className="w-12 h-12" />,
  'faq': <HelpCircle className="w-12 h-12" />,
  'wsparcie': <HeadphonesIcon className="w-12 h-12" />,
};

const StaticPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: page, isLoading, error } = useStaticPage(slug || '');

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (error || !page) {
    return <Navigate to="/404" replace />;
  }

  // Convert markdown-like content to HTML
  const renderContent = (content: string) => {
    return content
      .split('\n')
      .map((line, index) => {
        // Headers
        if (line.startsWith('### ')) {
          return (
            <h3 key={index} className="text-xl font-bold text-foreground mt-8 mb-3">
              {line.replace('### ', '')}
            </h3>
          );
        }
        if (line.startsWith('## ')) {
          return (
            <h2 key={index} className="text-2xl font-bold text-foreground mt-10 mb-4 pb-2 border-b border-border">
              {line.replace('## ', '')}
            </h2>
          );
        }
        if (line.startsWith('# ')) {
          return null; // Skip main title, we show it in hero
        }
        // Bold text
        if (line.startsWith('- **')) {
          const match = line.match(/- \*\*(.+?)\*\*:?\s*(.*)/);
          if (match) {
            return (
              <li key={index} className="flex items-start gap-2 mb-2">
                <span className="text-primary mt-1.5">•</span>
                <span>
                  <strong className="text-foreground">{match[1]}</strong>
                  {match[2] && `: ${match[2]}`}
                </span>
              </li>
            );
          }
        }
        // List items
        if (line.startsWith('- ')) {
          return (
            <li key={index} className="flex items-start gap-2 mb-2">
              <span className="text-primary mt-1.5">•</span>
              <span>{line.replace('- ', '')}</span>
            </li>
          );
        }
        // Empty lines
        if (line.trim() === '') {
          return <div key={index} className="h-4" />;
        }
        // Regular paragraphs
        return (
          <p key={index} className="text-muted-foreground leading-relaxed mb-2">
            {line}
          </p>
        );
      });
  };

  return (
    <Layout>
      <HeroSection
        title={page.title.replace('# ', '')}
        subtitle=""
        size="sm"
      />

      <section className="py-12 md:py-16">
        <div className="container max-w-4xl mx-auto px-4">
          <div className="glass-card p-8 md:p-12">
            <div className="flex items-center gap-4 mb-8 pb-6 border-b border-border">
              <div className="p-4 rounded-2xl bg-primary/10 text-primary">
                {iconMap[slug || ''] || <FileText className="w-12 h-12" />}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">{page.title}</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Ostatnia aktualizacja: {new Date(page.updated_at).toLocaleDateString('pl-PL')}
                </p>
              </div>
            </div>

            <div className="prose prose-invert max-w-none">
              {page.content && renderContent(page.content)}
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default StaticPage;
