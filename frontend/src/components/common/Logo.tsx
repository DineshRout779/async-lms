import type React from 'react';
import logoImg from '../../assets/logo.png';
import clsx from 'clsx';

type LogoProps = React.ImgHTMLAttributes<HTMLImageElement>;

const Logo = ({ className, ...props }: LogoProps) => {
  return (
    <img
      src={logoImg}
      className={clsx('', className)}
      alt='Barabari Logo'
      {...props}
    />
  );
};

export default Logo;
