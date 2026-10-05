import {test} from 'node:test';
import assert from 'node:assert/strict';
import {publicSupabaseSettings} from '../lib/config';
test('partial configuration and placeholders keep live mode unavailable',()=>{assert.equal(publicSupabaseSettings('https://example.supabase.co','YOUR_PUBLIC_ANON_KEY'),null);assert.equal(publicSupabaseSettings(),null);});
test('API URL with publishable key is accepted; dashboard URL is rejected',()=>{assert.ok(publicSupabaseSettings('https://example.supabase.co','sb_publishable_test'));assert.throws(()=>publicSupabaseSettings('https://supabase.com/dashboard/project/example','sb_publishable_test'),/API Project URL/);});
test('elevated keys are rejected before frontend compilation',()=>{assert.throws(()=>publicSupabaseSettings('https://example.supabase.co','sb_secret_test'),/Secret keys/);const jwt='eyJ.'+Buffer.from(JSON.stringify({role:'service_role'})).toString('base64url')+'.test';assert.throws(()=>publicSupabaseSettings('https://example.supabase.co',jwt),/not a valid legacy anon/);});

test('secret keys rejected even when the URL is missing',()=>{assert.throws(()=>publicSupabaseSettings(undefined,'sb_secret_test'),/Secret keys/);});
