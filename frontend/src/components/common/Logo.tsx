import type React from 'react';
import logoImg from '../../assets/logo.png';
import clsx from 'clsx';

type LogoProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  iconOnly?: boolean;
};

const Logo = ({ className, iconOnly, style, ...props }: LogoProps) => {
  if (iconOnly) {
    // Crop to the left half of the logo (the "B" mark) by containing it in an
    // overflow-hidden square and shifting the image left so only the B is visible.
    return (
      <div
        className={clsx('shrink-0 overflow-hidden rounded-sm', className)}
        style={style}
      >
        <img
          src={logoImg}
          className='h-full w-auto max-w-none'
          style={{ marginLeft: '-8%' }}
          alt='Barabari Logo'
          {...props}
        />
      </div>
    );
  }

  return (
    <img
      src={logoImg}
      className={clsx('aspect-square h-6 w-6', className)}
      alt='Barabari Logo'
      style={style}
      {...props}
    />
  );
};

export default Logo;
