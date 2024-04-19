import jwt from 'jsonwebtoken';

export const verifyAuthToken = async (req, res, next) => {
    const token = req.header('Authorization').split(" ")[1];
    if (!token) return res.status(401).json({ error: 'Access denied' });
    try {
        const decoded = jwt.verify(token, 'THIS_IS_MY_JWT_SECRET_KEY');
        req.userId = decoded.userId;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid or Expired token' });
    }
}