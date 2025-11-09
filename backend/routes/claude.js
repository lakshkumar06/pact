import express from 'express'
import fetch from 'node-fetch'
import { authenticateToken } from './auth.js'

const router = express.Router()

// POST /api/claude/chat
// Body: { prompt: string }
router.post('/chat', authenticateToken, async (req, res) => {
  const apiKey = process.env.CLAUDE_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'CLAUDE_API_KEY not configured on server' })

  const { prompt } = req.body
  if (!prompt) return res.status(400).json({ error: 'Prompt required' })

  try {
    // Sanitize prompt to avoid sending obvious secrets or sensitive identifiers to Anthropic
    const sanitizePrompt = (text) => {
      if (!text) return text
      // redact emails
      text = text.replace(/([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, '[REDACTED_EMAIL]')
      // redact US SSN patterns
      text = text.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[REDACTED_SSN]')
      // redact long hex strings (likely private keys, >30 hex chars)
      text = text.replace(/\b0x?[a-fA-F0-9]{30,}\b/g, '[REDACTED_HEX]')
      // redact AWS-like access keys (AKIA...)
      text = text.replace(/AKIA[0-9A-Z]{16}/g, '[REDACTED_AWS_KEY]')
      // redact generic long token-like strings (base64-ish, >40 chars)
      text = text.replace(/\b[A-Za-z0-9-_]{40,}\b/g, '[REDACTED_TOKEN]')
      // redact simple private key PEM blocks
      text = text.replace(/-----BEGIN PRIVATE KEY-----[\s\S]*?-----END PRIVATE KEY-----/g, '[REDACTED_PRIVATE_KEY]')
      return text
    }

    const safePrompt = sanitizePrompt(String(prompt))
    const body = {
      model: process.env.CLAUDE_MODEL || 'claude-3-sonnet-20240229',
      max_tokens: 1024,
      messages: [
        { role: 'user', content: safePrompt }
      ]
    }

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body)
    })

    if (!resp.ok) {
      const text = await resp.text()
      // Temporarily log full error for debugging
      console.error('Claude API error status:', resp.status)
      console.error('Claude API error details:', text)
      return res.status(502).json({ error: 'Claude API error', details: `status ${resp.status}` })
    }

    const data = await resp.json()
    // Anthropic Messages API returns content in messages format
    const completion = data.content?.[0]?.text || data.completion || ''
    // Return the completion only. Do not persist or log prompt/completion here to avoid accidental exposure.
    return res.json({ reply: completion })
  } catch (err) {
    // Log error object (stack) but avoid including request body contents
    console.error('Error calling Claude API:', err && err.stack ? err.stack : err)
    return res.status(500).json({ error: 'Failed to call Claude API' })
  }
})

export default router
