// Feature: project-scaffolding-auth — Smoke tests (Task 22)

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-dealtable';
process.env.JWT_EXPIRES_IN = '24h';
process.env.MONGO_URI = 'mongodb://placeholder';

const path = require('path');
const fs = require('fs');

const repoRoot = path.resolve(__dirname, '../../');

test('server/ directory exists at monorepo root', () => {
  const serverPath = path.join(repoRoot, 'server');
  expect(fs.existsSync(serverPath)).toBe(true);
  expect(fs.statSync(serverPath).isDirectory()).toBe(true);
});

test('client/ directory exists at monorepo root', () => {
  const clientPath = path.join(repoRoot, 'client');
  expect(fs.existsSync(clientPath)).toBe(true);
  expect(fs.statSync(clientPath).isDirectory()).toBe(true);
});

test('root package.json has dev, server, and client scripts', () => {
  const rootPackagePath = path.join(repoRoot, 'package.json');
  expect(fs.existsSync(rootPackagePath)).toBe(true);

  const rootPackage = JSON.parse(fs.readFileSync(rootPackagePath, 'utf8'));
  expect(rootPackage.scripts).toHaveProperty('dev');
  expect(rootPackage.scripts).toHaveProperty('server');
  expect(rootPackage.scripts).toHaveProperty('client');
});

test('server/package.json lists required production dependencies', () => {
  const serverPackagePath = path.join(repoRoot, 'server', 'package.json');
  const serverPackage = JSON.parse(fs.readFileSync(serverPackagePath, 'utf8'));
  const deps = serverPackage.dependencies || {};

  const requiredDeps = [
    'express',
    'mongoose',
    'jsonwebtoken',
    'bcryptjs',
    'dotenv',
    'cors',
    'helmet',
    'express-rate-limit',
  ];

  for (const dep of requiredDeps) {
    expect(deps).toHaveProperty(dep);
  }
});

test('client/package.json lists react-router-dom as a dependency', () => {
  const clientPackagePath = path.join(repoRoot, 'client', 'package.json');
  const clientPackage = JSON.parse(fs.readFileSync(clientPackagePath, 'utf8'));
  const deps = clientPackage.dependencies || {};

  expect(deps).toHaveProperty('react-router-dom');
});
