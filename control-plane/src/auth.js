import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {config} from './config.js';
import {forbidden, unauthorized} from './httpError.js';
import {queryOne} from './db.js';

export const hashPassword = password => bcrypt.hash(password, 12);

export const verifyPassword = (password, hash) => bcrypt.compare(password, hash);

export const signAccountToken = account =>
  jwt.sign(
    {
      sub: String(account.id),
      username: account.username,
      role: account.role,
      type: 'account',
    },
    config.jwtSecret,
    {expiresIn: config.jwtExpiresIn},
  );

export const requireAuth = async (req, _res, next) => {
  try {
    const header = req.get('authorization') || '';
    const match = header.match(/^Bearer\s+(.+)$/i);
    if (!match) {
      throw unauthorized();
    }

    const payload = jwt.verify(match[1], config.jwtSecret);
    const account = await queryOne(
      `select id, username, display_name, role, status
       from accounts
       where id = :id and deleted_at is null`,
      {id: payload.sub},
    );

    if (!account || account.status !== 'active') {
      throw unauthorized('账号不可用', 'account_unavailable');
    }

    req.account = account;
    next();
  } catch (error) {
    next(error.status ? error : unauthorized());
  }
};

export const requireAdmin = (req, _res, next) => {
  if (!['super_admin', 'admin'].includes(req.account?.role)) {
    next(forbidden('需要管理员权限'));
    return;
  }

  next();
};

export const requireSuperAdmin = (req, _res, next) => {
  if (req.account?.role !== 'super_admin') {
    next(forbidden('需要超级管理员权限'));
    return;
  }

  next();
};

