//CHAPTER-3- VARIABLES, DATA TYPE AND OPERATIONS

//THEORY
  //A. VARIABLES- INTRODUCTION - RN
  //B. RULES FOR DECLARING A VARIABLE - RN

class Main {
  public static void main(String[] args) {

    
  //C. HOW TO DECLARE A VARIABLE
    // 1. Declaring a variable:
       float simpleInterest; 

    // 2. Declaring and initializing a variable:
       char var = 'h'; 

    // 3. Declaring and initializing more than one variable of same data type:
       int time = 10, speed = 20; 

    
  //D. DATATYPE- INTRODUCTION- RN
  //E. TYPES OF DATA TYPE
    //1. INT:
    int a = 43, biggestInt = 2147483647, smallestInt = -2147483648;

    //2. Byte:
    byte b = 92, biggestByte = 127, smallestByte = -128;

    //3. Short:
    short c = 32767, biggestShort = 32767, smallestShort = -32768;

    //4. Long:
    long d = 343234212L, biggestLong = 9223372036854775807L, smallestLong = -9223372036854775808L;


    //5. Float:
    float e = 23.5f;

    //6. Double:
    double f = 23.5d, g = 23.98;

    //7. Boolean:
    boolean h = true, i = false;

    //8. Char:
    char j = 'a', k = 'A';


  //F. OVERFLOW AND UNDERFLOW
    //1. Overflow:
    int l = Integer.MAX_VALUE;
    int m = l + 1;
    System.out.println(m);
    
    // Note: Here j will roll over to -2147483648, and still be a integer. 
    // Note: Applied for byte, short, int and long.
    
    double n = Double.MAX_VALUE;
    double o = n + 1;
    
    // Note: Here in case of double and float o will be Infinity.

    
    //2. Underflow:
    int p = -2147483648;
    int s = p - 1;
    System.out.println(s);
    
    // Note: Here also the value will roll over to max positive side 2147483647.
    // Note: Applied for byte, short int and long.

    float q = Float.MIN_VALUE;
    float r = q - 1;
    System.out.println(r);

    double u = Double.MIN_VALUE;
    double v = u - 1;
    System.out.println(v);
    
    // Note: Here in case of double and float o will be -1.0.

  //G. TYPE CONVERSION
    //1. Automatic Type Conersion:
    int sourceA = 12;
    float destinationA = sourceA;
    System.out.println(destinationA);
    
    //Note: Here source memory size is smaller than destination memory size, and 
    //they both are compatible.

    //2. Manual Type Conversion:
    float sourceM = 12.3f;
    int destiantionM = (int)sourceM;
    System.out.println(destiantionM);
    
    //Note: Here source memory size is bigger than destination memory size, and 
    //they both were not compatible. If they were compatible then also we can 
    //type cast.

  //H. OPEARTORS -INTRODUCTION
 
    //1. Unary Operator:
    int a1 = +2;
    int b1 = -2;
    int c1 = a1++; //TP- Here a1 value will be 2 only but afterward whenever a1 is used it will be increased.
    System.out.println(c1);
    int d1 = ++a1; //TP- Here a1 value wii become 3 immediately.
    System.out.println(d1);
    boolean e1 = !true;
    System.out.println(e1);
    
    //2. Arithmatic Operators:
    int f1 = 14;
    int g1 = 3;
    int h1 = f1 % g1;
    System.out.println(h1);
    
    //3. Shift Operator:
    int i1 = 2;
    int j1 = i1<<4;
    System.out.println(j1);

    //4. Relational Opeartors:
    Main k1 = new Main();
    System.out.println(k1 instanceof Main);

    //5. Bitwise Opeartor:
    int l1 = 5;
    int m1 = 6;
    int n1 = l1 & m1;
    int o1 = l1 ^ m1;
    int p1 = l1 | m1;
    System.out.println(n1);
    System.out.println(o1);
    System.out.println(p1);

    //6. Logical Opeartor:
    boolean s1 = true;
    Boolean t1 = false;
    System.out.println(s1 && t1);

    //7. Teranry Operator:
    int u1 = (1==1?33:44);
    System.out.println(u1);
    System.out.println(1==2?true:false); //TP-The complete expression converts into one of the  
    //two values depending upon the outcome.

    //8. Assignement Opeartor:
    int v1 = 1;
    v1 += 1;     //TP- It's a shortcut for v1 = v1 + 1.
    int w1 = 1; 
    w1 &= 1;      //TP- It's a shortcut for w1 = w1 & 1.
    int x1 = 1; 
    x1 <<= 1;    //TP- It's a shortcut for x1 = x1 << 1.
    System.out.println(v1);
    System.out.println(w1);
    System.out.println(x1);

  //I. PRECEDENCE AND ASSOCIATIVITY OF OPEARTORS
    //1. Precedence:
      int a2 = 2 + 4 * 9 << 2;
      // O1: 4 * 9
      // O2: 2 + 36
      // O3: 38 << 2

    //2. Associativity:
     int b2 = 3 + 4 - 6; //TP- This is 11th number precedence, here L-R Associativity applies.
     // O1: 3 + 4
     // O2: 7 - 6
    



    
//EXERCISES
  //EXERCISE-1(P1&P2)- RPDF


    
   

    


    
    
  

    

    
    
    
    

    



















    
  }
}