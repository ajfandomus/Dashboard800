import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useSheetData } from '@/lib/sheetsEngine';
import PageHeader from '@/components/dashboard/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sparkles,
  Send,
  Loader2,
  Copy,
  Check,
  Flower,
  Mic,
  MicOff,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

export default function AIAsk() {
  const [prompt, setPrompt] = useState('');
  const [sheetScope, setSheetScope] = useState('all');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(null);
  const [isListening, setIsListening] = useState(false);

  const recognitionRef = useRef(null);
  const bottomRef = useRef(null);

  const orders = useSheetData('orders');
  const products = useSheetData('products');

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const dataSummary = useMemo(() => {
    const s = {};

    if (sheetScope === 'all' || sheetScope === 'orders') {
      const byStatus = {};
      const byDate = {};
      const byProduct = {};
      const byFlorist = {};

      orders.data.forEach(o => {
        const status = o.status || o.delivery_status || 'Unknown';
        byStatus[status] = (byStatus[status] || 0) + 1;

        const date = o.order_date
          ? String(o.order_date).split(' ')[0]
          : 'Unknown';

        byDate[date] = (byDate[date] || 0) + 1;

        const prods = String(o.product || '')
          .split(',')
          .map(p => p.trim())
          .filter(Boolean);

        prods.forEach(p => {
          byProduct[p] = (byProduct[p] || 0) + 1;
        });

        if (o.florist) {
          byFlorist[o.florist] = (byFlorist[o.florist] || 0) + 1;
        }
      });

      s.orders = {
        totalOrders: orders.data.length,
        byStatus,
        byDate,
        byProduct,
        byFlorist,
      };
    }

    if (sheetScope === 'all' || sheetScope === 'products') {
      const top10 = [...products.data]
        .sort((a, b) => (b.sales_count || 0) - (a.sales_count || 0))
        .slice(0, 10)
        .map(p => ({
          name: p.name,
          sales: p.sales_count,
          category: p.category,
          trend: p.trend,
          last_order_date: p.last_order_date,
        }));

      s.products = {
        count: products.data.length,
        top10,
      };
    }

    return s;
  }, [sheetScope, orders.data, products.data]);

  const handleVoice = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error('Voice input not supported in this browser.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = 'en-US';
    recognition.interimResults = false;

    recognition.onresult = e => {
      const transcript = e.results[0][0].transcript;

      setPrompt(prev => (prev ? `${prev} ${transcript}` : transcript));
      setIsListening(false);
    };

    recognition.onerror = () => {
      toast.error('Voice input error. Try again.');
      setIsListening(false);
    };

    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();

    setIsListening(true);
  };

  const handleAsk = async () => {
    if (!prompt.trim() || isLoading) return;

    if (!GROQ_API_KEY) {
      toast.error('Missing Groq API key. Add VITE_GROQ_API_KEY in .env');
      return;
    }

    const userMsg = prompt.trim();
    setPrompt('');

    const newMessages = [
      ...messages,
      {
        role: 'user',
        content: userMsg,
      },
    ];

    setMessages(newMessages);
    setIsLoading(true);

    try {
      const toLines = (rows, fields) =>
        `${fields.join('|')}\n${rows
          .map(row => fields.map(field => row[field] ?? '').join('|'))
          .join('\n')}`;

      const orderFields = [
        'order_date',
        'order_id',
        'customer_name',
        'product',
        'quantity',
        'status',
        'delivery_status',
        'florist',
        'city',
        'payment',
      ];

      const productFields = [
        'name',
        'category',
        'sales_count',
        'order_count',
        'trend',
        'last_order_date',
      ];

      const sections = [];

      if ((sheetScope === 'all' || sheetScope === 'orders') && orders.data.length) {
        sections.push(
          `=== ORDERS (${orders.data.length} rows) ===\n${toLines(
            orders.data,
            orderFields
          )}`
        );
      }

      if (
        (sheetScope === 'all' || sheetScope === 'products') &&
        products.data.length
      ) {
        sections.push(
          `=== PRODUCTS (${products.data.length} rows) ===\n${toLines(
            products.data,
            productFields
          )}`
        );
      }

      const systemPrompt = `You are an expert business analyst for a luxury flower ecommerce business in the UAE.

Available data: Orders + Products.

Schema:
- Orders: order_date | order_id | customer_name | product | quantity | status | delivery_status | florist | city | payment
- Products: name | category | sales_count | order_count | trend | last_order_date

=== AGGREGATED SUMMARY ===
${JSON.stringify(dataSummary, null, 2)}

${sections.join('\n\n')}

Rules:
- Answer short and direct.
- Lead with the answer immediately.
- Max 5 bullet points.
- Do not say "based on the data" unless needed.
- Use only the data provided above.
- If the user asks for advice, give practical business advice.`;

      const res = await fetch(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${GROQ_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'meta-llama/llama-4-scout-17b-16e-instruct',
            max_tokens: 400,
            messages: [
              {
                role: 'system',
                content: systemPrompt,
              },
              ...newMessages.map(message => ({
                role: message.role,
                content: message.content,
              })),
            ],
          }),
        }
      );

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData?.error?.message || `API error ${res.status}`);
      }

      const data = await res.json();

      const text =
        data.choices?.[0]?.message?.content || 'No response received.';

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: text,
        },
      ]);
    } catch (err) {
      console.error(err);

      toast.error(`Failed to get AI response: ${err.message}`);

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content:
            '⚠️ Sorry, I could not process that request. Please try again.',
        },
      ]);
    }

    setIsLoading(false);
  };

  const handleCopy = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopied(index);
    toast.success('Copied!');

    setTimeout(() => setCopied(null), 2000);
  };

  const suggestions = [
    'What are my top selling products?',
    'How many orders were delivered vs pending?',
    'Which florist has the most orders?',
    'What products were ordered most this month?',
    'Show me orders from last week',
    'Which products are trending?',
    'What sold the most today?',
    'Who are my most frequent customers?',
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Ask"
        subtitle="Ask your AI analyst about your flower business data"
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4">
          <Card className="border-border/60">
            <CardContent className="space-y-4 p-5">
              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Data Scope
                </label>

                <Select value={sheetScope} onValueChange={setSheetScope}>
                  <SelectTrigger className="border-0 bg-secondary/60">
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="all">All Data</SelectItem>
                    <SelectItem value="orders">Orders</SelectItem>
                    <SelectItem value="products">Products</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Your Question
                </label>

                <div className="relative">
                  <Textarea
                    value={prompt}
                    onChange={event => setPrompt(event.target.value)}
                    placeholder="Ask anything about your flower business..."
                    className="min-h-[100px] resize-none border-0 bg-secondary/60 pr-10"
                    onKeyDown={event => {
                      if (
                        event.key === 'Enter' &&
                        (event.metaKey || event.ctrlKey)
                      ) {
                        handleAsk();
                      }
                    }}
                  />

                  <button
                    onClick={handleVoice}
                    className={`absolute bottom-2 right-2 rounded-md p-1.5 transition-colors ${
                      isListening
                        ? 'animate-pulse bg-red-500/10 text-red-500'
                        : 'text-muted-foreground hover:bg-primary/10 hover:text-primary'
                    }`}
                    title={isListening ? 'Stop listening' : 'Voice input'}
                  >
                    {isListening ? (
                      <MicOff className="h-4 w-4" />
                    ) : (
                      <Mic className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {isListening && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-red-500">
                    <span className="inline-block h-1.5 w-1.5 animate-ping rounded-full bg-red-500" />
                    Listening...
                  </p>
                )}
              </div>

              <Button
                onClick={handleAsk}
                disabled={isLoading || !prompt.trim()}
                className="w-full bg-primary hover:bg-primary/90"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Ask AI
                  </>
                )}
              </Button>

              {messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMessages([])}
                  className="w-full text-xs text-muted-foreground"
                >
                  Clear conversation
                </Button>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardContent className="p-5">
              <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Flower className="h-3.5 w-3.5 text-primary" />
                Suggested Questions
              </p>

              <div className="space-y-1.5">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => setPrompt(suggestion)}
                    className="w-full rounded-lg px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
                  >
                    <Sparkles className="mr-2 inline h-3 w-3 text-primary opacity-70" />
                    {suggestion}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="border-border/60">
            <CardContent className="p-0">
              <div className="h-[600px] space-y-4 overflow-y-auto p-6">
                {messages.length === 0 && !isLoading ? (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <div className="mb-4 text-5xl">🌸</div>

                    <h3 className="mb-2 text-lg font-semibold text-foreground">
                      Your AI Business Analyst
                    </h3>

                    <p className="max-w-sm text-sm text-muted-foreground">
                      Ask anything about your orders and products. Use the mic
                      🎤 to speak your question.
                    </p>
                  </div>
                ) : (
                  <>
                    {messages.map((message, index) => (
                      <div
                        key={index}
                        className={`flex ${
                          message.role === 'user'
                            ? 'justify-end'
                            : 'justify-start'
                        }`}
                      >
                        {message.role === 'assistant' && (
                          <div className="mr-2 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                            <Sparkles className="h-3.5 w-3.5 text-primary" />
                          </div>
                        )}

                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                            message.role === 'user'
                              ? 'rounded-tr-sm bg-primary text-primary-foreground'
                              : 'rounded-tl-sm bg-secondary/60 text-foreground'
                          }`}
                        >
                          {message.role === 'assistant' ? (
                            <div className="prose prose-sm max-w-none text-foreground">
                              <ReactMarkdown>{message.content}</ReactMarkdown>

                              <button
                                onClick={() =>
                                  handleCopy(message.content, index)
                                }
                                className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                              >
                                {copied === index ? (
                                  <>
                                    <Check className="h-3 w-3" />
                                    Copied
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-3 w-3" />
                                    Copy
                                  </>
                                )}
                              </button>
                            </div>
                          ) : (
                            message.content
                          )}
                        </div>
                      </div>
                    ))}

                    {isLoading && (
                      <div className="flex justify-start">
                        <div className="mr-2 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                          <Sparkles className="h-3.5 w-3.5 text-primary" />
                        </div>

                        <div className="rounded-2xl rounded-tl-sm bg-secondary/60 px-4 py-3">
                          <div className="flex h-4 items-center gap-1">
                            <span className="h-2 w-2 animate-bounce rounded-full bg-primary/60" />
                            <span
                              className="h-2 w-2 animate-bounce rounded-full bg-primary/60"
                              style={{ animationDelay: '150ms' }}
                            />
                            <span
                              className="h-2 w-2 animate-bounce rounded-full bg-primary/60"
                              style={{ animationDelay: '300ms' }}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    <div ref={bottomRef} />
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}