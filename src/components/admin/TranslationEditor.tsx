import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Check, AlertTriangle, Sparkles, Zap, Eye, EyeOff, Plus, Settings, Trash2, RefreshCw, Languages, Download, FileText, Newspaper } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/LanguageContext';
import { useContent } from '@/hooks/use-local-data';
import { BlogTranslationEditor } from './BlogTranslationEditor';

interface TranslationData {
  _meta: { name: string; flag: string };
  translations: Record<string, string>;
}

interface LanguageOption {
  code: string;
  name: string;
  flag: string;
}

// AI Provider configuration
interface AIProvider {
  id: string;
  name: string;
  description: string;
  apiEndpoint: string;
  model: string;
  modelsEndpoint?: string;
  requiresProjectId?: boolean;
  buildRequest: (prompt: string, apiKey: string, model: string) => {
    headers: Record<string, string>;
    body: string;
    endpoint?: string;
  };
  extractResponse: (response: unknown) => string;
  fetchModels?: (apiKey: string, proxyUrl?: string) => Promise<string[]>;
}

const AI_PROVIDERS: AIProvider[] = [
  {
    id: 'google',
    name: 'Google AI',
    description: 'Gemini 2.5 (requires proxy outside US/EU)',
    apiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent',
    model: 'gemini-2.5-flash',
    buildRequest: (prompt, apiKey, model) => ({
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3 }
      }),
      endpoint: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
    }),
    extractResponse: (response: unknown) => {
      const r = response as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
      return r.candidates?.[0]?.content?.parts?.[0]?.text || '';
    },
    fetchModels: async (apiKey, proxyUrl) => {
      if (!apiKey) return [];
      try {
        const response = await fetch('/api/ai/models', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
            headers: { 'x-goog-api-key': apiKey },
            proxyUrl
          })
        });
        if (!response.ok) return [];
        const data = await response.json();
        interface GoogleModel {
          name?: string;
          supportedGenerationMethods?: string[];
        }
        const models = data.models
          ?.filter((m: GoogleModel) => m.name?.includes('gemini') && m.supportedGenerationMethods?.includes('generateContent'))
          ?.map((m: GoogleModel) => m.name?.replace('models/', ''))
          ?.filter((name: string) => name?.includes('2.5') || name?.includes('2.0') || name?.includes('flash') || name?.includes('pro'))
          ?.sort((a: string, b: string) => {
            if (a.includes('2.5') && !b.includes('2.5')) return -1;
            if (!a.includes('2.5') && b.includes('2.5')) return 1;
            return a.localeCompare(b);
          }) || [];
        return models.length > 0 ? models : ['gemini-2.5-flash', 'gemini-2.5-pro'];
      } catch {
        return ['gemini-2.5-flash', 'gemini-2.5-pro'];
      }
    }
  },
  {
    id: 'groq',
    name: 'Groq',
    description: 'Llama 3.3 70B (fast)',
    apiEndpoint: 'https://api.groq.com/openai/v1/chat/completions',
    modelsEndpoint: 'https://api.groq.com/openai/v1/models',
    model: 'llama-3.3-70b-versatile',
    buildRequest: (prompt, apiKey, model) => ({
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3
      })
    }),
    extractResponse: (response: unknown) => {
      const r = response as { choices?: Array<{ message?: { content?: string } }> };
      return r.choices?.[0]?.message?.content || '';
    },
    fetchModels: async (apiKey, proxyUrl) => {
      if (!apiKey) return [];
      try {
        const response = await fetch('/api/ai/models', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint: 'https://api.groq.com/openai/v1/models',
            headers: { 'Authorization': `Bearer ${apiKey}` },
            proxyUrl
          })
        });
        if (!response.ok) return [];
        const data = await response.json();
        return data.data?.map((m: { id: string }) => m.id)?.sort() || [];
      } catch {
        return [];
      }
    }
  },
  {
    id: 'opencode',
    name: 'OpenCode',
    description: 'Free & paid models',
    apiEndpoint: 'https://opencode.ai/zen/v1/chat/completions',
    modelsEndpoint: 'https://opencode.ai/zen/v1/models',
    model: 'big-pickle',
    buildRequest: (prompt, apiKey, model) => {
      // Different models use different endpoints and request formats
      // See: https://opencode.ai/docs/zen/#endpoints
      const isGemini = model.startsWith('gemini-');
      const isClaude = model.startsWith('claude-');
      const isGpt = model.startsWith('gpt-');

      let endpoint: string;
      let body: string;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };

      if (isGemini) {
        // Gemini uses Google AI format
        // NOTE: Gemini models currently have a bug in OpenCode API (promptTokenCount undefined)
        // Using x-goog-api-key header for Gemini
        endpoint = `https://opencode.ai/zen/v1/models/${model}`;
        body = JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3 }
        });
        if (apiKey) headers['x-goog-api-key'] = apiKey;
      } else if (isClaude) {
        // Claude uses Anthropic messages format with x-api-key header
        endpoint = 'https://opencode.ai/zen/v1/messages';
        body = JSON.stringify({
          model,
          max_tokens: 8192,
          messages: [{ role: 'user', content: prompt }]
        });
        if (apiKey) headers['x-api-key'] = apiKey;
        headers['anthropic-version'] = '2023-06-01';
      } else if (isGpt) {
        // GPT uses OpenAI responses format
        endpoint = 'https://opencode.ai/zen/v1/responses';
        body = JSON.stringify({
          model,
          input: prompt
        });
        if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
      } else {
        // Default: chat/completions (GLM, Kimi, Qwen, Big Pickle, etc.)
        endpoint = 'https://opencode.ai/zen/v1/chat/completions';
        body = JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3
        });
        if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
      }

      return { headers, body, endpoint };
    },
    extractResponse: (response: unknown) => {
      // Handle different response formats based on API type
      const r = response as Record<string, unknown>;

      // OpenAI chat/completions format (GLM, Kimi, Qwen, Big Pickle)
      if (r.choices && Array.isArray(r.choices)) {
        const choices = r.choices as Array<{ message?: { content?: string } }>;
        return choices[0]?.message?.content || '';
      }

      // Google AI / Gemini format
      if (r.candidates && Array.isArray(r.candidates)) {
        const candidates = r.candidates as Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        return candidates[0]?.content?.parts?.[0]?.text || '';
      }

      // Anthropic / Claude format
      if (r.content && Array.isArray(r.content)) {
        const content = r.content as Array<{ type?: string; text?: string }>;
        const textBlock = content.find(c => c.type === 'text');
        return textBlock?.text || '';
      }

      // OpenAI responses format (GPT)
      if (r.output && Array.isArray(r.output)) {
        const output = r.output as Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }>;
        const message = output.find(o => o.type === 'message');
        const textContent = message?.content?.find(c => c.type === 'output_text');
        return textContent?.text || '';
      }

      return '';
    },
    fetchModels: async (_apiKey, proxyUrl) => {
      const response = await fetch('/api/ai/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: 'https://opencode.ai/zen/v1/models',
          headers: {},
          proxyUrl
        })
      });
      if (!response.ok) return [];
      const data = await response.json();
      return data.data?.map((m: { id: string }) => m.id)?.sort() || [];
    }
  },
  {
    id: 'opencode-local',
    name: 'OpenCode (Local)',
    description: 'Uses locally installed opencode CLI',
    apiEndpoint: '/api/ai/opencode-local',
    modelsEndpoint: '/api/ai/opencode-local/models',
    model: 'opencode/big-pickle',
    buildRequest: (prompt, _apiKey, model) => ({
      headers: { 'Content-Type': 'application/json' },
      // Body is handled differently - we send prompt/model directly
      body: JSON.stringify({ prompt, model }),
      endpoint: '/api/ai/opencode-local'
    }),
    extractResponse: (response: unknown) => {
      // Response is already in OpenAI format from our local endpoint
      const r = response as { choices?: Array<{ message?: { content?: string } }> };
      return r.choices?.[0]?.message?.content || '';
    },
    fetchModels: async () => {
      // Fetch models from local opencode CLI
      try {
        const response = await fetch('/api/ai/opencode-local/models');
        if (!response.ok) return [];
        const data = await response.json();
        return data.models || [];
      } catch {
        return [];
      }
    }
  },
  {
    id: 'custom-openai',
    name: 'Custom (OpenAI API)',
    description: 'Any OpenAI-compatible endpoint',
    apiEndpoint: '', // Will be set via customEndpoint field
    model: 'gpt-4o',
    buildRequest: (prompt, apiKey, model) => ({
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {})
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3
      })
    }),
    extractResponse: (response: unknown) => {
      const r = response as { choices?: Array<{ message?: { content?: string } }> };
      return r.choices?.[0]?.message?.content || '';
    }
  },
  {
    id: 'ollama',
    name: 'Ollama (Local)',
    description: 'Local Ollama server',
    apiEndpoint: 'http://localhost:11434/v1/chat/completions',
    modelsEndpoint: 'http://localhost:11434/api/tags',
    model: 'llama3.2',
    buildRequest: (prompt, _apiKey, model) => ({
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        stream: false
      })
    }),
    extractResponse: (response: unknown) => {
      // Ollama uses OpenAI-compatible format
      const r = response as { choices?: Array<{ message?: { content?: string } }> };
      return r.choices?.[0]?.message?.content || '';
    },
    fetchModels: async () => {
      // Ollama models are fetched locally, no proxy needed
      try {
        const response = await fetch('/api/ai/ollama-models');
        if (!response.ok) return [];
        const data = await response.json();
        return data.models?.map((m: { name: string }) => m.name)?.sort() || [];
      } catch {
        return [];
      }
    }
  },
  {
    id: 'gemini-cli',
    name: 'Gemini CLI',
    description: 'Uses locally installed gemini CLI (requires GOOGLE_CLOUD_PROJECT)',
    apiEndpoint: '/api/ai/gemini-cli',
    model: 'gemini-2.5-flash',
    requiresProjectId: true,
    buildRequest: (prompt, _apiKey, model) => ({
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, model }),
      endpoint: '/api/ai/gemini-cli'
    }),
    extractResponse: (response: unknown) => {
      // Gemini CLI returns { response: "..." } in JSON mode
      const r = response as { response?: string; choices?: Array<{ message?: { content?: string } }> };
      // Extract from markdown code block if present
      const text = r.response || r.choices?.[0]?.message?.content || '';
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
      return jsonMatch ? jsonMatch[1].trim() : text;
    },
    fetchModels: async () => {
      // Return common Gemini models - CLI doesn't have a models list command
      return [
        'gemini-2.5-pro',
        'gemini-2.5-flash',
        'gemini-2.5-flash-lite',
        'gemini-2.0-flash',
        'gemini-2.0-flash-lite'
      ];
    }
  }
];

export function TranslationEditor() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'ui' | 'blog'>('ui');
  const [languages, setLanguages] = useState<LanguageOption[]>([]);
  const [selectedLang, setSelectedLang] = useState<string>('');
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [englishTranslations, setEnglishTranslations] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // Content for AI prompt
  const [content, saveContent] = useContent();
  const defaultPrompt = `You are a professional translator. Translate the following JSON object values from English to {{targetLang}}.
Keep the JSON structure and keys exactly the same. Only translate the values.
Preserve any HTML tags and attributes unchanged (e.g., <a href="...">link</a>, <strong>, <p>, etc.).
Preserve any Markdown formatting unchanged (e.g., **bold**, *italic*, [links](...), # headers, - lists, etc.).
Keep brand names unchanged (MiniOS, Debian, Ubuntu, Linux, XFCE, Fluxbox, SquashFS, Flux, Standard, Toolbox, Ultra, etc.).
Keep language names in their native form (e.g., 'Deutsch' not 'German', 'Русский' not 'Russian').
Return ONLY the JSON object, no explanations or markdown code blocks.`;
  const [translationPrompt, setTranslationPrompt] = useState<string>('');

  // Sync prompt from content
  useEffect(() => {
    setTranslationPrompt(content.aiTranslation?.prompt || defaultPrompt);
  }, [content.aiTranslation?.prompt, defaultPrompt]);

  // Save prompt to content
  const handlePromptChange = (newPrompt: string) => {
    setTranslationPrompt(newPrompt);
  };

  const handlePromptSave = async () => {
    const updatedContent = {
      ...content,
      aiTranslation: { prompt: translationPrompt }
    };
    try {
      await saveContent(updatedContent);
      toast.success(t('Prompt saved'));
    } catch {
      toast.error(t('Failed to save prompt'));
    }
  };

  // AI Provider state
  const [selectedProvider, setSelectedProvider] = useState<string>('opencode');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [apiKey, setApiKey] = useState<string>('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [proxyUrl, setProxyUrl] = useState<string>('');
  const [showProxy, setShowProxy] = useState(false);
  const [googleProjectId, setGoogleProjectId] = useState<string>('');
  const [customEndpoint, setCustomEndpoint] = useState<string>('');
  const [customModel, setCustomModel] = useState<string>('');
  const [chunkSize, setChunkSize] = useState<number>(0); // 0 = all at once
  const [requestTimeout, setRequestTimeout] = useState<number>(300); // seconds, default 5 min
  const [isTranslatingAll, setIsTranslatingAll] = useState(false);
  const [translatingAllProgress, setTranslatingAllProgress] = useState<string>('');

  // Add language modal state
  const [showAddLang, setShowAddLang] = useState(false);
  const [newLangCode, setNewLangCode] = useState('');
  const [newLangName, setNewLangName] = useState('');
  const [newLangFlag, setNewLangFlag] = useState('');
  const [addingLang, setAddingLang] = useState(false);
  const [translatingName, setTranslatingName] = useState(false);

  // Edit language modal state
  const [showEditLang, setShowEditLang] = useState(false);
  const [editLangCode, setEditLangCode] = useState('');
  const [editLangName, setEditLangName] = useState('');
  const [editLangFlag, setEditLangFlag] = useState('');
  const [savingLang, setSavingLang] = useState(false);
  const [deletingLang, setDeletingLang] = useState(false);
  const [translatingEditName, setTranslatingEditName] = useState(false);

  // Sync state
  const [syncing, setSyncing] = useState(false);
  const [stats, setStats] = useState<Record<string, { total: number; translated: number }>>({});

  // Load API key, model, proxy, timeout, and custom endpoint/model from localStorage, then load models
  useEffect(() => {
    const savedKey = localStorage.getItem(`ai-api-key-${selectedProvider}`);
    const savedProxy = localStorage.getItem('ai-proxy-url');
    const savedModel = localStorage.getItem(`ai-model-${selectedProvider}`);
    const savedEndpoint = localStorage.getItem(`ai-endpoint-${selectedProvider}`);
    const savedCustomModel = localStorage.getItem(`ai-custom-model-${selectedProvider}`);
    const savedTimeout = localStorage.getItem('ai-request-timeout');
    const savedProjectId = localStorage.getItem('ai-google-project-id');
    const provider = AI_PROVIDERS.find(p => p.id === selectedProvider);

    setApiKey(savedKey || '');
    setProxyUrl(savedProxy || '');
    setGoogleProjectId(savedProjectId || '');
    setSelectedModel(savedModel || provider?.model || '');
    setCustomEndpoint(savedEndpoint || '');
    setCustomModel(savedCustomModel || '');
    if (savedTimeout) setRequestTimeout(parseInt(savedTimeout, 10) || 300);

    // Load models with the saved values (not state, which may not be updated yet)
    if (!provider?.fetchModels) {
      setAvailableModels([]);
      return;
    }

    const requiresKeyForModels = ['groq', 'google'].includes(provider.id);
    if (requiresKeyForModels && !savedKey) {
      setAvailableModels([]);
      return;
    }

    setLoadingModels(true);
    provider.fetchModels(savedKey || '', savedProxy || '')
      .then(models => {
        setAvailableModels(models);
        if (models.length > 0 && savedModel && !models.includes(savedModel)) {
          setSelectedModel(provider.model);
        }
      })
      .catch(err => {
        console.error('Failed to load models:', err);
        setAvailableModels([]);
      })
      .finally(() => setLoadingModels(false));
  }, [selectedProvider]);

  // Reload models when API key or proxy changes (after initial load)
  useEffect(() => {
    // Skip on mount - handled by the effect above
    const provider = AI_PROVIDERS.find(p => p.id === selectedProvider);
    if (!provider?.fetchModels) return;

    const requiresKeyForModels = ['groq', 'google'].includes(provider.id);
    if (requiresKeyForModels && !apiKey) {
      setAvailableModels([]);
      return;
    }

    setLoadingModels(true);
    provider.fetchModels(apiKey, proxyUrl)
      .then(models => {
        setAvailableModels(models);
        if (models.length > 0 && !models.includes(selectedModel)) {
          setSelectedModel(provider.model);
        }
      })
      .catch(err => {
        console.error('Failed to load models:', err);
        setAvailableModels([]);
      })
      .finally(() => setLoadingModels(false));
  }, [apiKey, proxyUrl, selectedProvider, selectedModel]);

  // Save API key to localStorage when changed
  const handleApiKeyChange = (key: string) => {
    setApiKey(key);
    if (key) {
      localStorage.setItem(`ai-api-key-${selectedProvider}`, key);
    } else {
      localStorage.removeItem(`ai-api-key-${selectedProvider}`);
    }
  };

  // Save model to localStorage when changed
  const handleModelChange = (model: string) => {
    setSelectedModel(model);
    if (model) {
      localStorage.setItem(`ai-model-${selectedProvider}`, model);
    }
  };

  // Save proxy URL to localStorage when changed
  const handleProxyChange = (proxy: string) => {
    setProxyUrl(proxy);
    if (proxy) {
      localStorage.setItem('ai-proxy-url', proxy);
    } else {
      localStorage.removeItem('ai-proxy-url');
    }
  };

  // Load stats
  const loadStats = () => {
    fetch('/api/translations/stats')
      .then(res => res.json())
      .then(setStats)
      .catch(console.error);
  };

  // Sync translations
  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/translations/sync', { method: 'POST' });
      const data = await res.json();
      if (data.added > 0 || data.removed > 0) {
        toast.success(`Synced: +${data.added} -${data.removed} keys`);
        loadLanguages();
        loadStats();
      } else {
        toast.info('Already in sync');
      }
    } catch {
      toast.error('Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  // Load available languages
  const loadLanguages = () => {
    fetch('/api/languages')
      .then(res => res.json())
      .then((langs: LanguageOption[]) => {
        setLanguages(langs);
        if (!selectedLang) {
          const defaultLang = langs.find(l => l.code !== 'en')?.code || langs[0]?.code || 'en';
          setSelectedLang(defaultLang);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadLanguages();
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load translations for selected language
  useEffect(() => {
    if (!selectedLang) return;

    Promise.all([
      fetch(`/translations/${selectedLang}.json`).then(r => r.json()).catch(() => ({ translations: {} })),
      fetch('/api/translations/keys').then(r => r.json()).catch(() => [])
    ])
      .then(([langData, keysData]: [TranslationData, string[] | { keys: string[] }]) => {
        setTranslations(langData.translations || {});
        // Create english translations map from keys (key = value for English)
        const englishMap: Record<string, string> = {};
        const keys = Array.isArray(keysData) ? keysData : (keysData?.keys || []);
        for (const key of keys) {
          englishMap[key] = key;
        }
        setEnglishTranslations(englishMap);
      })
      .catch(console.error);
  }, [selectedLang]);

  // Add new language
  const handleAddLanguage = async () => {
    if (!newLangCode || !newLangName) {
      toast.error('Language code and name are required');
      return;
    }

    setAddingLang(true);
    try {
      const response = await fetch('/api/languages/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newLangCode.trim(),
          name: newLangName,
          flag: newLangFlag
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`Language "${newLangName}" created with ${data.keys} keys`);
        setShowAddLang(false);
        setNewLangCode('');
        setNewLangName('');
        setNewLangFlag('');
        loadLanguages();
        loadStats();
        setSelectedLang(newLangCode.trim());
      } else {
        toast.error(data.error || 'Failed to create language');
      }
    } catch {
      toast.error('Failed to create language');
    } finally {
      setAddingLang(false);
    }
  };

  // Open edit language modal
  const openEditLang = () => {
    const currentLang = languages.find(l => l.code === selectedLang);
    if (currentLang) {
      setEditLangCode(currentLang.code);
      setEditLangName(currentLang.name);
      setEditLangFlag(currentLang.flag);
      setShowEditLang(true);
    }
  };

  // Update language metadata
  const handleUpdateLanguage = async () => {
    setSavingLang(true);
    try {
      const response = await fetch('/api/languages/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: editLangCode,
          name: editLangName,
          flag: editLangFlag
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Language updated');
        setShowEditLang(false);
        loadLanguages();
      } else {
        toast.error(data.error || 'Failed to update language');
      }
    } catch {
      toast.error('Failed to update language');
    } finally {
      setSavingLang(false);
    }
  };

  // Delete language
  const handleDeleteLanguage = async () => {
    if (!confirm(`Are you sure you want to delete "${editLangName}" (${editLangCode})? This cannot be undone.`)) {
      return;
    }

    setDeletingLang(true);
    try {
      const response = await fetch('/api/languages/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: editLangCode })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`Language "${editLangName}" deleted`);
        setShowEditLang(false);
        setSelectedLang('en');
        loadLanguages();
        loadStats();
      } else {
        toast.error(data.error || 'Failed to delete language');
      }
    } catch {
      toast.error('Failed to delete language');
    } finally {
      setDeletingLang(false);
    }
  };

  // Translate language name to native language and get flag using AI
  const translateLanguageName = async (langCode: string, currentName: string, isEdit: boolean) => {
    const provider = AI_PROVIDERS.find(p => p.id === selectedProvider);
    if (!provider) {
      toast.error(t('Please select an AI provider'));
      return;
    }

    // OpenCode, OpenCode Local, and Gemini CLI don't require API key
    if (!apiKey && selectedProvider !== 'opencode' && selectedProvider !== 'opencode-local' && selectedProvider !== 'gemini-cli') {
      toast.error('Please enter your API key');
      return;
    }

    // Gemini CLI requires project ID
    if (selectedProvider === 'gemini-cli' && !googleProjectId) {
      toast.error('Please enter GOOGLE_CLOUD_PROJECT');
      return;
    }

    if (isEdit) {
      setTranslatingEditName(true);
    } else {
      setTranslatingName(true);
    }

    try {
      const prompt = `For the language with ISO code "${langCode}":
1. What is its native name? (e.g., "en" -> "English", "ru" -> "Русский", "de" -> "Deutsch", "zh-CN" -> "简体中文", "uk" -> "Українська", "pl" -> "Polski")
2. What is its flag emoji? (e.g., "en" -> "🇺🇸" or "🇬🇧", "ru" -> "🇷🇺", "de" -> "🇩🇪", "zh-CN" -> "🇨🇳", "uk" -> "🇺🇦", "pl" -> "🇵🇱")

Current name provided: "${currentName}"

Return ONLY a JSON object like this, nothing else:
{"name": "Native Name", "flag": "🇽🇽"}`;

      const modelToUse = selectedModel || provider.model;
      const requestData = provider.buildRequest(prompt, apiKey, modelToUse);
      const { headers, body } = requestData;
      const endpoint = requestData.endpoint || provider.apiEndpoint;

      let response: Response;
      if (provider.id === 'gemini-cli') {
        response = await fetch('/api/ai/gemini-cli', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, model: modelToUse, projectId: googleProjectId })
        });
      } else {
        response = await fetch('/api/ai/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint, headers, body, proxyUrl })
        });
      }

      if (!response.ok) throw new Error('API error');

      const data = await response.json();
      const content = provider.extractResponse(data).trim();

      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        if (parsed.name && parsed.name.length < 50) {
          if (isEdit) {
            setEditLangName(parsed.name);
            if (parsed.flag) setEditLangFlag(parsed.flag);
          } else {
            setNewLangName(parsed.name);
            if (parsed.flag) setNewLangFlag(parsed.flag);
          }
          toast.success(t('Auto-filled name and flag'));
        }
      }
    } catch (error) {
      console.error('Translation error:', error);
      toast.error(t('Failed to translate'));
    } finally {
      if (isEdit) {
        setTranslatingEditName(false);
      } else {
        setTranslatingName(false);
      }
    }
  };

  // Download translation file
  const handleDownload = () => {
    const lang = languages.find(l => l.code === selectedLang);
    const data = {
      _meta: { name: lang?.name || selectedLang, flag: lang?.flag || '' },
      translations
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedLang}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Helper function to translate a chunk of keys with retry for rate limits
  const translateChunk = async (
    keysToTranslate: Record<string, string>,
    targetLang: string,
    provider: AIProvider,
    modelToUse: string,
    maxRetries: number = 3
  ): Promise<Record<string, string>> => {
    // Use prompt from config with {{targetLang}} placeholder
    const promptTemplate = translationPrompt || defaultPrompt;
    const prompt = `${promptTemplate.replace(/\{\{targetLang\}\}/g, targetLang)}

${JSON.stringify(keysToTranslate, null, 2)}`;

    // Determine actual model and endpoint to use
    // For custom-openai and ollama, use customModel if set, otherwise selectedModel
    const actualModel = (provider.id === 'custom-openai' || provider.id === 'ollama') && customModel
      ? customModel
      : modelToUse;

    const requestData = provider.buildRequest(prompt, apiKey, actualModel);
    const { headers, body } = requestData;

    // Determine the endpoint to use
    // For custom-openai: use customEndpoint or error
    // For ollama: use customEndpoint or default to localhost
    let endpoint = requestData.endpoint || provider.apiEndpoint;
    if (provider.id === 'custom-openai') {
      endpoint = customEndpoint || '';
      if (!endpoint) {
        throw new Error('Custom endpoint is required for Custom OpenAI provider');
      }
    } else if (provider.id === 'ollama') {
      endpoint = customEndpoint || 'http://localhost:11434/v1/chat/completions';
    }

    // Special handling for OpenCode Local - send directly to our local endpoint
    const isOpenCodeLocal = provider.id === 'opencode-local';
    const isGeminiCli = provider.id === 'gemini-cli';

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      let response: Response;

      // Create AbortController with user-defined timeout (in seconds, convert to ms)
      const controller = new AbortController();
      const timeoutMs = requestTimeout * 1000;
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        if (isGeminiCli) {
          // Gemini CLI: send prompt and model directly with project ID
          response = await fetch('/api/ai/gemini-cli', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, model: actualModel, projectId: googleProjectId }),
            signal: controller.signal
          });
        } else if (isOpenCodeLocal) {
          // OpenCode Local: send prompt and model directly, with proxy and timeout
          response = await fetch('/api/ai/opencode-local', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, model: actualModel, proxyUrl, timeout: requestTimeout }),
            signal: controller.signal
          });
        } else {
          // Other providers: use the proxy endpoint
          response = await fetch('/api/ai/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint, headers, body, proxyUrl }),
            signal: controller.signal
          });
        }
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.log('[AI Translate] Error response:', errorText);

        // Handle rate limit (429) with retry
        if (response.status === 429 && attempt < maxRetries) {
          // Try to extract retry delay from response
          let retryDelay = 60; // default 60 seconds
          try {
            const errorData = JSON.parse(errorText);
            const retryInfo = errorData.error?.details?.find(
              (d: { '@type': string }) => d['@type']?.includes('RetryInfo')
            );
            if (retryInfo?.retryDelay) {
              const match = retryInfo.retryDelay.match(/(\d+)/);
              if (match) retryDelay = parseInt(match[1], 10) + 5; // add 5s buffer
            }
          } catch { /* ignore parse errors */ }

          console.log(`[AI Translate] Rate limited, waiting ${retryDelay}s before retry ${attempt + 1}/${maxRetries}...`);
          toast.info(t('Rate limited, waiting {{seconds}}s...').replace('{{seconds}}', String(retryDelay)));
          await new Promise(resolve => setTimeout(resolve, retryDelay * 1000));
          continue;
        }

        // Check for known Gemini bug with OpenCode
        if (errorText.includes('promptTokenCount')) {
          throw new Error('Gemini models have a known bug with OpenCode API. Please switch to a different model (e.g., big-pickle, claude-3-5-sonnet, or use Groq).');
        }

        // For other errors, throw immediately
        throw new Error(`API error ${response.status}`);
      }

      // Success - parse response
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error.message || data.error);
      }

      console.log('[AI Translate] Raw response:', JSON.stringify(data).substring(0, 1000));
      const content = provider.extractResponse(data);
      console.log('[AI Translate] Extracted content:', content?.substring(0, 500) || '(empty)');
      if (!content || content.trim() === '') {
        const keysCount = Object.keys(keysToTranslate).length;
        console.error('[AI Translate] Empty content. Full response:', JSON.stringify(data, null, 2).substring(0, 2000));
        throw new Error(`AI returned empty response. Request may be too large (${keysCount} keys). Try reducing Batch size to 50 or less.`);
      }

      let jsonStr = content.trim();
      const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        jsonStr = codeBlockMatch[1];
      }

      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('AI response (no JSON found):', content);
        throw new Error('AI response does not contain valid JSON');
      }

      return JSON.parse(jsonMatch[0]);
    }

    // If we exhausted all retries
    throw new Error('Rate limit exceeded after retries');
  };

  // Callback for translating blog posts (passed to BlogTranslationEditor)
  const translateBlogPost = useCallback(async (
    sourceContent: string,
    targetLang: string,
    _onProgress?: (progress: string) => void // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<string> => {
    const provider = AI_PROVIDERS.find(p => p.id === selectedProvider);
    if (!provider) {
      throw new Error('Please select an AI provider');
    }

    // OpenCode, OpenCode Local, Ollama, and Gemini CLI don't require API key
    if (!apiKey && !['opencode', 'opencode-local', 'ollama', 'gemini-cli'].includes(selectedProvider)) {
      throw new Error('Please enter your API key');
    }

    if (selectedProvider === 'custom-openai' && !customEndpoint) {
      throw new Error('Please enter your API endpoint');
    }

    if (selectedProvider === 'gemini-cli' && !googleProjectId) {
      throw new Error('Please enter GOOGLE_CLOUD_PROJECT');
    }

    const modelToUse = selectedModel || provider.model;
    
    // Use the blog translation prompt
    const blogPrompt = `You are a professional translator. Translate the following JSON object from English to ${targetLang}.
Keep the JSON structure exactly the same. Translate the values of "title", "excerpt", and "content" fields.
Preserve any Markdown formatting unchanged (e.g., **bold**, *italic*, [links](...), # headers, - lists, code blocks, etc.).
Preserve any HTML tags unchanged.
Keep brand names unchanged (MiniOS, Debian, Ubuntu, Linux, etc.).
Return ONLY the JSON object, no explanations or markdown code blocks.

${sourceContent}`;

    // Determine actual model and endpoint
    const actualModel = (provider.id === 'custom-openai' || provider.id === 'ollama') && customModel
      ? customModel
      : modelToUse;

    const requestData = provider.buildRequest(blogPrompt, apiKey, actualModel);
    const { headers, body } = requestData;

    let endpoint = requestData.endpoint || provider.apiEndpoint;
    if (provider.id === 'custom-openai') {
      endpoint = customEndpoint || '';
    } else if (provider.id === 'ollama') {
      endpoint = customEndpoint || 'http://localhost:11434/v1/chat/completions';
    }

    const isOpenCodeLocal = provider.id === 'opencode-local';
    const isGeminiCli = provider.id === 'gemini-cli';

    const controller = new AbortController();
    const timeoutMs = requestTimeout * 1000;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;

    try {
      if (isGeminiCli) {
        response = await fetch('/api/ai/gemini-cli', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: blogPrompt, model: actualModel, projectId: googleProjectId }),
          signal: controller.signal
        });
      } else if (isOpenCodeLocal) {
        response = await fetch('/api/ai/opencode-local', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: blogPrompt, model: actualModel, proxyUrl, timeout: requestTimeout }),
          signal: controller.signal
        });
      } else {
        response = await fetch('/api/ai/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint, headers, body, proxyUrl }),
          signal: controller.signal
        });
      }
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Blog Translate] Error:', errorText);
      
      // Check for known Gemini bug with OpenCode
      if (errorText.includes('promptTokenCount')) {
        throw new Error('Gemini models have a known bug with OpenCode API. Please switch to a different model (e.g., big-pickle, claude-3-5-sonnet, or use Groq).');
      }
      
      throw new Error(`API error ${response.status}`);
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message || data.error);
    }

    const contentResult = provider.extractResponse(data);
    if (!contentResult || contentResult.trim() === '') {
      throw new Error('AI returned empty response');
    }

    return contentResult;
  }, [selectedProvider, selectedModel, apiKey, customEndpoint, customModel, proxyUrl, requestTimeout, googleProjectId]);

  // AI-powered translation for current language
  const handleAITranslate = async () => {
    const provider = AI_PROVIDERS.find(p => p.id === selectedProvider);
    if (!provider) {
      toast.error('Please select an AI provider');
      return;
    }

    // OpenCode, OpenCode Local, Ollama, and Gemini CLI don't require API key
    // Custom OpenAI requires endpoint instead
    if (!apiKey && !['opencode', 'opencode-local', 'ollama', 'gemini-cli'].includes(selectedProvider)) {
      toast.error('Please enter your API key');
      return;
    }

    if (selectedProvider === 'custom-openai' && !customEndpoint) {
      toast.error('Please enter your API endpoint');
      return;
    }

    // Gemini CLI requires project ID
    if (selectedProvider === 'gemini-cli' && !googleProjectId) {
      toast.error('Please enter GOOGLE_CLOUD_PROJECT');
      return;
    }

    const emptyKeys = Object.entries(translations)
      .filter(([, value]) => !value || value.trim() === '')
      .map(([key]) => key);

    if (emptyKeys.length === 0) {
      toast.info('No untranslated keys');
      return;
    }

    const targetLang = languages.find(l => l.code === selectedLang)?.name || selectedLang;
    const modelToUse = selectedModel || provider.model;

    setIsTranslatingAll(true);
    let totalTranslated = 0;

    try {
      const keysToTranslate = Object.fromEntries(
        emptyKeys.map(k => [k, englishTranslations[k] || k])
      );

      console.log('[AI Translate] Keys to translate:', emptyKeys.length);
      console.log('[AI Translate] Chunk size:', chunkSize || 'all');

      // Accumulator object that persists across chunks
      const accumulatedTranslations = { ...translations };

      // Helper to save chunk results immediately
      const saveChunkResults = async (chunkResult: Record<string, string>) => {
        let count = 0;

        for (const [key, value] of Object.entries(chunkResult)) {
          if (key in accumulatedTranslations && typeof value === 'string') {
            accumulatedTranslations[key] = value;
            count++;
          }
        }

        if (count > 0) {
          await fetch('/api/translations/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              langCode: selectedLang,
              translations: accumulatedTranslations
            })
          });

          setTranslations({ ...accumulatedTranslations });
          totalTranslated += count;
        }

        return count;
      };

      // If chunkSize is 0, translate all at once; otherwise use chunks
      if (chunkSize === 0 || emptyKeys.length <= chunkSize) {
        setTranslatingAllProgress(`Translating ${emptyKeys.length} keys...`);
        const result = await translateChunk(keysToTranslate, targetLang, provider, modelToUse);
        await saveChunkResults(result);
      } else {
        // Split into chunks
        const chunks: Record<string, string>[] = [];
        const entries = Object.entries(keysToTranslate);
        for (let i = 0; i < entries.length; i += chunkSize) {
          chunks.push(Object.fromEntries(entries.slice(i, i + chunkSize)));
        }

        console.log('[AI Translate] Processing', chunks.length, 'chunks of', chunkSize);

        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          const chunkKeys = Object.keys(chunk).length;
          setTranslatingAllProgress(`Chunk ${i + 1}/${chunks.length} (${chunkKeys} keys)...`);

          try {
            const chunkResult = await translateChunk(chunk, targetLang, provider, modelToUse);
            const saved = await saveChunkResults(chunkResult);
            console.log(`[AI Translate] Chunk ${i + 1} done:`, saved, 'keys saved');
          } catch (chunkError) {
            console.error(`[AI Translate] Chunk ${i + 1} failed:`, chunkError);
            toast.error(`Chunk ${i + 1} failed, continuing...`);
          }

          // Small delay between chunks to avoid rate limiting
          if (i < chunks.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }

      loadStats();

      if (totalTranslated > 0) {
        toast.success(`Translated and saved ${totalTranslated} keys`);
      } else {
        toast.error('No translations received');
      }
    } catch (error) {
      console.error('AI translation error:', error);
      toast.error(`Translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsTranslatingAll(false);
      setTranslatingAllProgress('');
    }
  };

  // Translate all languages with missing translations
  const handleTranslateAllLanguages = async () => {
    const provider = AI_PROVIDERS.find(p => p.id === selectedProvider);
    if (!provider) {
      toast.error('Please select an AI provider');
      return;
    }

    // OpenCode, OpenCode Local, Ollama, and Gemini CLI don't require API key
    // Custom OpenAI requires endpoint instead
    if (!apiKey && !['opencode', 'opencode-local', 'ollama', 'gemini-cli'].includes(selectedProvider)) {
      toast.error('Please enter your API key');
      return;
    }

    if (selectedProvider === 'custom-openai' && !customEndpoint) {
      toast.error('Please enter your API endpoint');
      return;
    }

    // Gemini CLI requires project ID
    if (selectedProvider === 'gemini-cli' && !googleProjectId) {
      toast.error('Please enter GOOGLE_CLOUD_PROJECT');
      return;
    }

    const langsToTranslate = languages
      .filter(lang => lang.code !== 'en' && stats[lang.code])
      .filter(lang => {
        const s = stats[lang.code];
        return s.total - s.translated > 0;
      });

    if (langsToTranslate.length === 0) {
      toast.info('All languages are fully translated');
      return;
    }

    setIsTranslatingAll(true);
    let totalKeysTranslated = 0;
    let successCount = 0;
    let failCount = 0;
    const modelToUse = selectedModel || provider.model;

    for (let langIdx = 0; langIdx < langsToTranslate.length; langIdx++) {
      const lang = langsToTranslate[langIdx];

      try {
        const langData = await fetch(`/translations/${lang.code}.json`)
          .then(r => r.json())
          .catch(() => ({ translations: {} }));

        const langTranslations = langData.translations || {};

        const emptyKeys = Object.keys(langTranslations)
          .filter(key => !langTranslations[key] || langTranslations[key].trim() === '');

        if (emptyKeys.length === 0) continue;

        // For English values, key = value
        const keysToTranslate = Object.fromEntries(
          emptyKeys.map(k => [k, k])
        );

        // Helper to save chunk results for this language
        const saveChunkToLang = async (chunkResult: Record<string, string>) => {
          let count = 0;
          for (const [key, value] of Object.entries(chunkResult)) {
            if (key in langTranslations && typeof value === 'string') {
              langTranslations[key] = value;
              count++;
            }
          }

          if (count > 0) {
            await fetch('/api/translations/update', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                langCode: lang.code,
                translations: langTranslations
              })
            });
            totalKeysTranslated += count;
          }
          return count;
        };

        // Use chunking if chunkSize > 0
        if (chunkSize === 0 || emptyKeys.length <= chunkSize) {
          setTranslatingAllProgress(`${lang.flag} ${lang.name} (${emptyKeys.length} keys)... [${langIdx + 1}/${langsToTranslate.length}]`);
          const result = await translateChunk(keysToTranslate, lang.name, provider, modelToUse);
          await saveChunkToLang(result);
          successCount++;
          console.log(`[Translate All] ${lang.name}: translated ${emptyKeys.length} keys`);
          // Update stats after each language
          loadStats();
        } else {
          // Split into chunks
          const chunks: Record<string, string>[] = [];
          const entries = Object.entries(keysToTranslate);
          for (let i = 0; i < entries.length; i += chunkSize) {
            chunks.push(Object.fromEntries(entries.slice(i, i + chunkSize)));
          }

          console.log(`[Translate All] ${lang.name}: ${chunks.length} chunks of ${chunkSize}`);
          let langKeysTranslated = 0;

          for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const chunkKeyCount = Object.keys(chunk).length;
            setTranslatingAllProgress(
              `${lang.flag} ${lang.name} chunk ${i + 1}/${chunks.length} (${chunkKeyCount} keys)... [${langIdx + 1}/${langsToTranslate.length}]`
            );

            try {
              const chunkResult = await translateChunk(chunk, lang.name, provider, modelToUse);
              const saved = await saveChunkToLang(chunkResult);
              langKeysTranslated += saved;
              console.log(`[Translate All] ${lang.name} chunk ${i + 1}: ${saved} keys saved`);
            } catch (chunkError) {
              console.error(`[Translate All] ${lang.name} chunk ${i + 1} failed:`, chunkError);
            }

            // Small delay between chunks
            if (i < chunks.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }

          if (langKeysTranslated > 0) {
            successCount++;
            console.log(`[Translate All] ${lang.name}: total ${langKeysTranslated} keys`);
            // Update stats after each language
            loadStats();
          }
        }
      } catch (error) {
        console.error(`[Translate All] Error translating ${lang.name}:`, error);
        failCount++;
      }
    }

    setIsTranslatingAll(false);
    setTranslatingAllProgress('');
    loadStats();

    // Reload current language
    if (selectedLang && selectedLang !== 'en') {
      const langData = await fetch(`/translations/${selectedLang}.json`).then(r => r.json());
      setTranslations(langData.translations || {});
    }

    if (failCount === 0) {
      toast.success(`Translated ${successCount} language${successCount !== 1 ? 's' : ''} (${totalKeysTranslated} keys)`);
    } else {
      toast.warning(`Translated ${successCount} (${totalKeysTranslated} keys), failed ${failCount}`);
    }
  };

  const emptyCount = Object.values(translations).filter(v => !v || v.trim() === '').length;
  const totalCount = Object.keys(translations).length;
  const translatedCount = totalCount - emptyCount;

  // Translation skeleton component
  const TranslationSkeleton = () => (
    <div className="admin-skeleton-content">
      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        <div className="skeleton-box" style={{ width: 200, height: 40, borderRadius: 6 }} />
        <div className="skeleton-box" style={{ width: 140, height: 40, borderRadius: 6 }} />
        <div className="skeleton-box" style={{ width: 100, height: 40, borderRadius: 6 }} />
      </div>
      <div className="admin-skeleton-card">
        <div className="admin-skeleton-card-header">
          <div className="skeleton-box" style={{ width: 150, height: 20, borderRadius: 4 }} />
        </div>
        <div className="admin-skeleton-card-body">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <div className="skeleton-box" style={{ width: '30%', height: 16, borderRadius: 4 }} />
              <div className="skeleton-box" style={{ flex: 1, height: 40, borderRadius: 6 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <AnimatePresence mode="wait">
      {loading ? (
        <motion.div
          key="skeleton"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <TranslationSkeleton />
        </motion.div>
      ) : (
        <motion.div
          key="content"
          className="space-y-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
      {/* Add Language Modal */}
      <Dialog open={showAddLang} onOpenChange={setShowAddLang}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Languages className="w-4 h-4 text-primary" />
              {t('Add New Language')}
            </DialogTitle>
            <DialogDescription>{t('Create a new translation file')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div>
              <label htmlFor="newLangCode" className="admin-label">{t('Language Code')} *</label>
              <div className="flex gap-2">
                <Input
                  id="newLangCode"
                  placeholder="pl, zh-CN, uk"
                  value={newLangCode}
                  onChange={e => setNewLangCode(e.target.value)}
                  className="font-mono flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => translateLanguageName(newLangCode, newLangName, false)}
                  disabled={!newLangCode || (!apiKey && selectedProvider !== 'opencode') || translatingName}
                  title={t('Auto-fill name and flag')}
                  className="gap-2 shrink-0"
                >
                  {translatingName ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  {t('Auto-fill')}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">{t('Enter code and click Auto-fill to get name and flag')}</p>
            </div>

            <div>
              <label htmlFor="newLangName" className="admin-label">{t('Language Name')} *</label>
              <Input
                id="newLangName"
                placeholder="Polski, 中文, Українська"
                value={newLangName}
                onChange={e => setNewLangName(e.target.value)}
              />
            </div>

            <div className="w-24">
              <label htmlFor="newLangFlag" className="admin-label">{t('Flag')}</label>
              <Input
                id="newLangFlag"
                placeholder="🇵🇱"
                value={newLangFlag}
                onChange={e => setNewLangFlag(e.target.value)}
                className="text-center text-xl"
              />
            </div>

            {newLangCode && newLangName && (
              <div className="admin-preview-card">
                <span className="text-2xl">{newLangFlag || '🌐'}</span>
                <div>
                  <div className="font-medium">{newLangName}</div>
                  <div className="text-xs text-muted-foreground font-mono">{newLangCode.toLowerCase()}.json</div>
                </div>
              </div>
            )}
          </div>

          <div className="admin-dialog-footer">
            <Button variant="outline" className="flex-1" onClick={() => setShowAddLang(false)}>
              {t('Cancel')}
            </Button>
            <Button className="flex-1 gap-2" onClick={handleAddLanguage} disabled={addingLang || !newLangCode || !newLangName}>
              <Plus className="w-4 h-4" />
              {addingLang ? t('Creating...') : t('Create')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Language Modal */}
      <Dialog open={showEditLang} onOpenChange={setShowEditLang}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-primary" />
              {t('Edit language')}: <span className="font-mono">{editLangCode}</span>
            </DialogTitle>
            <DialogDescription>{t('Update language settings')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div>
              <label htmlFor="editLangName" className="admin-label">{t('Language Name')} *</label>
              <div className="flex gap-2">
                <Input
                  id="editLangName"
                  value={editLangName}
                  onChange={e => setEditLangName(e.target.value)}
                  className="flex-1"
                  placeholder="English, Русский, 中文"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => translateLanguageName(editLangCode, editLangName, true)}
                  disabled={(!apiKey && selectedProvider !== 'opencode') || translatingEditName}
                  title={t('Auto-fill name and flag')}
                  className="gap-1.5 shrink-0"
                >
                  {translatingEditName ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  {t('Auto-fill')}
                </Button>
              </div>
            </div>

            <div className="w-24">
              <label htmlFor="editLangFlag" className="admin-label">{t('Flag')}</label>
              <Input
                id="editLangFlag"
                value={editLangFlag}
                onChange={e => setEditLangFlag(e.target.value)}
                className="text-center text-xl"
                placeholder="🌐"
              />
            </div>

            <div className="admin-preview-card">
              <span className="text-2xl">{editLangFlag || '🌐'}</span>
              <div>
                <div className="font-medium">{editLangName}</div>
                <div className="text-xs text-muted-foreground font-mono">{editLangCode}.json</div>
              </div>
            </div>

            <div className="admin-dialog-footer">
              <Button variant="outline" className="flex-1" onClick={() => setShowEditLang(false)}>
                {t('Cancel')}
              </Button>
              <Button className="flex-1" onClick={handleUpdateLanguage} disabled={savingLang || !editLangName}>
                {savingLang ? t('Saving...') : t('Save')}
              </Button>
            </div>

            {editLangCode !== 'en' && (
              <div className="pt-4 border-t border-border/50">
                <button
                  type="button"
                  className="admin-delete-btn"
                  onClick={handleDeleteLanguage}
                  disabled={deletingLang}
                >
                  <Trash2 className="w-4 h-4" />
                  {deletingLang ? t('Deleting...') : t('Delete Language')}
                </button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Provider Section - shared between tabs */}
      <div className="ai-provider-card">
        <div className="ai-provider-header">
          <Zap className="w-4 h-4" />
          <span>{t('AI Auto-Translation')}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{t('Provider')}</label>
            <SearchableSelect
              value={selectedProvider}
              onChange={setSelectedProvider}
              options={AI_PROVIDERS.map(provider => ({
                value: provider.id,
                label: provider.name,
              }))}
              placeholder={t('Select provider')}
              searchPlaceholder={t('Search providers...')}
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{t('Model')}</label>
            <SearchableSelect
              value={selectedModel}
              onChange={handleModelChange}
              disabled={loadingModels}
              options={
                availableModels.length > 0
                  ? availableModels.map(model => ({ value: model, label: model }))
                  : [{
                    value: AI_PROVIDERS.find(p => p.id === selectedProvider)?.model || '',
                    label: AI_PROVIDERS.find(p => p.id === selectedProvider)?.model || ''
                  }]
              }
              placeholder={loadingModels ? t('Loading...') : t('Select model')}
              searchPlaceholder={t('Search models...')}
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{t('API Key')}</label>
            <div className="relative">
              <Input
                type={showApiKey ? 'text' : 'password'}
                placeholder="sk-..."
                value={apiKey}
                onChange={e => handleApiKeyChange(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{t('HTTP Proxy')} <span className="opacity-60">({t('for geo-restricted APIs')})</span></label>
            <div className="relative">
              <Input
                type={showProxy ? 'text' : 'password'}
                placeholder="http://user:pass@host:port"
                value={proxyUrl}
                onChange={e => handleProxyChange(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowProxy(!showProxy)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showProxy ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Custom endpoint for custom-openai and ollama */}
          {(selectedProvider === 'custom-openai' || selectedProvider === 'ollama') && (
            <>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  {t('API Endpoint')}
                  <span className="opacity-60 ml-1">
                    ({selectedProvider === 'ollama' ? 'http://localhost:11434/v1/chat/completions' : 'OpenAI-compatible'})
                  </span>
                </label>
                <Input
                  type="text"
                  placeholder={selectedProvider === 'ollama'
                    ? 'http://localhost:11434/v1/chat/completions'
                    : 'https://api.example.com/v1/chat/completions'}
                  value={customEndpoint}
                  onChange={e => {
                    setCustomEndpoint(e.target.value);
                    localStorage.setItem(`ai-endpoint-${selectedProvider}`, e.target.value);
                  }}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  {t('Model name')} <span className="opacity-60">({t('if not in list')})</span>
                </label>
                <Input
                  type="text"
                  placeholder="gpt-4o / llama3.2 / ..."
                  value={customModel}
                  onChange={e => {
                    setCustomModel(e.target.value);
                    localStorage.setItem(`ai-custom-model-${selectedProvider}`, e.target.value);
                  }}
                />
              </div>
            </>
          )}

          {/* Google Cloud Project ID for gemini-cli */}
          {selectedProvider === 'gemini-cli' && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                GOOGLE_CLOUD_PROJECT
              </label>
              <Input
                type="text"
                placeholder="your-project-id"
                value={googleProjectId}
                onChange={e => {
                  setGoogleProjectId(e.target.value);
                  localStorage.setItem('ai-google-project-id', e.target.value);
                }}
              />
            </div>
          )}

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{t('Batch size')}</label>
            <Input
              type="number"
              min="0"
              placeholder="0"
              value={chunkSize || ''}
              onChange={e => setChunkSize(parseInt(e.target.value) || 0)}
              className="w-20"
            />
            <span className="ai-field-hint">{t('0 = all at once')}</span>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{t('Timeout')} <span className="opacity-60">({t('seconds')})</span></label>
            <Input
              type="number"
              min="30"
              max="600"
              placeholder="300"
              value={requestTimeout}
              onChange={e => {
                const val = parseInt(e.target.value) || 300;
                setRequestTimeout(val);
                localStorage.setItem('ai-request-timeout', String(val));
              }}
              className="w-20"
            />
            <span className="ai-field-hint">{t('Request timeout per batch')}</span>
          </div>

          <div className="col-span-full">
            <label className="text-xs text-muted-foreground mb-1 block">
              {t('Translation Prompt')}
              <span className="opacity-60 ml-1">({'{{targetLang}}'} {t('will be replaced with language name')})</span>
            </label>
            <textarea
              value={translationPrompt}
              onChange={e => handlePromptChange(e.target.value)}
              onBlur={handlePromptSave}
              rows={4}
              className="w-full p-2 text-sm border rounded-md bg-background resize-y min-h-[80px]"
              placeholder={defaultPrompt}
            />
          </div>
        </div>
      </div>

      {/* Tabs for UI Strings vs Blog Posts */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'ui' | 'blog')} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="ui" className="gap-2">
            <FileText className="w-4 h-4" />
            {t('UI Strings')}
          </TabsTrigger>
          <TabsTrigger value="blog" className="gap-2">
            <Newspaper className="w-4 h-4" />
            {t('Blog Posts')}
          </TabsTrigger>
        </TabsList>

        {/* UI Strings Tab */}
        <TabsContent value="ui" className="space-y-6" forceMount>
          <AnimatePresence mode="wait">
            {activeTab === 'ui' && (
              <motion.div
                key="ui-tab"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="space-y-6"
              >
          {/* Language selector */}
          <div className="flex items-center gap-2 flex-wrap">
        <SearchableSelect
          value={selectedLang}
          onChange={setSelectedLang}
          options={languages.map(lang => {
            const s = stats[lang.code];
            const pct = s ? Math.round((s.translated / s.total) * 100) : 0;
            return {
              value: lang.code,
              label: `${lang.flag} ${lang.name} (${pct}%)`,
            };
          })}
          placeholder={t('Select language')}
          searchPlaceholder={t('Search languages...')}
          className="w-56"
        />

        <Button variant="outline" size="icon" onClick={() => setShowAddLang(true)} title={t('Add language')}>
          <Plus className="w-4 h-4" />
        </Button>

        <Button variant="outline" size="icon" onClick={openEditLang} title={t('Edit language')} disabled={!selectedLang}>
          <Settings className="w-4 h-4" />
        </Button>

        <Button variant="outline" size="icon" onClick={handleDownload} title={t('Download JSON')}>
          <Download className="w-4 h-4" />
        </Button>

        <Button variant="outline" size="icon" onClick={handleSync} disabled={syncing} title={t('Sync Keys')}>
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
        </Button>

        <div className="ml-auto text-sm text-muted-foreground">
          {translatedCount}/{totalCount} {t('translated')}
          {emptyCount > 0 && <span className="text-yellow-500 ml-2">({emptyCount} {t('missing')})</span>}
        </div>
      </div>

      {/* Action buttons for UI Strings translation */}
      <div className="flex items-center gap-4 flex-wrap">
          <button
            type="button"
            onClick={handleAITranslate}
            disabled={isTranslatingAll || (!apiKey && !['opencode', 'opencode-local', 'ollama', 'gemini-cli'].includes(selectedProvider)) || (selectedProvider === 'custom-openai' && !customEndpoint) || (selectedProvider === 'gemini-cli' && !googleProjectId) || emptyCount === 0}
            className="ai-translate-btn"
          >
            <Sparkles className="w-4 h-4" />
            {isTranslatingAll ? translatingAllProgress : `${t('Translate')} ${emptyCount} ${t('missing')}`}
          </button>

          <button
            type="button"
            onClick={handleTranslateAllLanguages}
            disabled={isTranslatingAll || (!apiKey && !['opencode', 'opencode-local', 'ollama', 'gemini-cli'].includes(selectedProvider)) || (selectedProvider === 'custom-openai' && !customEndpoint) || (selectedProvider === 'gemini-cli' && !googleProjectId)}
            className="ai-translate-all-btn"
          >
            <Languages className="w-4 h-4" />
            {t('Translate All Languages')}
          </button>
        </div>

      {/* Translation table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="max-h-[600px] overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 sticky top-0">
              <tr>
                <th className="text-left p-3 font-medium w-8"></th>
                <th className="text-left p-3 font-medium">{t('English')}</th>
                <th className="text-left p-3 font-medium">{languages.find(l => l.code === selectedLang)?.name || selectedLang}</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(translations).map(key => {
                const value = translations[key];
                const isEmpty = !value || value.trim() === '';
                const englishValue = englishTranslations[key] || key;

                return (
                  <tr key={key} className="border-t">
                    <td className="p-3">
                      {isEmpty ? (
                        <AlertTriangle className="w-4 h-4 text-yellow-500" />
                      ) : (
                        <Check className="w-4 h-4 text-green-500" />
                      )}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {englishValue.length > 80 ? englishValue.slice(0, 80) + '...' : englishValue}
                    </td>
                    <td className="p-3">
                      {isEmpty ? (
                        <span className="text-muted-foreground italic">{t('Not translated')}</span>
                      ) : (
                        value.length > 80 ? value.slice(0, 80) + '...' : value
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="p-2 text-center text-xs text-muted-foreground bg-muted/30 border-t">
          {Object.keys(translations).length} {t('translation keys')}
        </div>
      </div>
              </motion.div>
            )}
          </AnimatePresence>
        </TabsContent>

        {/* Blog Posts Tab */}
        <TabsContent value="blog" className="space-y-6" forceMount>
          <AnimatePresence mode="wait">
            {activeTab === 'blog' && (
              <motion.div
                key="blog-tab"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <BlogTranslationEditor
                  onTranslatePost={translateBlogPost}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </TabsContent>
      </Tabs>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
